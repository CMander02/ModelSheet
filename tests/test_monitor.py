"""Regression checks for complete scans, identity and state retention; no network."""
import copy
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import httpx
from modelsheet_cli import monitor as m


def item(source='hf', mid='moonshotai/Kimi-K2.5', revision='abc', updated=1):
    return dict(source=source, id=mid, revision=revision, updated_at=updated,
                url=m.BASE[source] + '/' + mid, tags=[])


class IdentityTests(unittest.TestCase):
    def setUp(self):
        self.config = m.read_json(Path(__file__).resolve().parents[1] / 'data/monitoring.example.json')
        self.identity, self.targets = m.validate_config(self.config)

    def test_only_requested_platforms_are_queried(self):
        self.assertEqual((len(self.config['groups']), len(self.targets)), (23, 35))
        expected = {
            'qwen': {'hf': 'Qwen', 'ms': 'Qwen'},
            'deepseek': {'hf': 'deepseek-ai', 'ms': 'deepseek-ai'},
            'mimo': {'hf': 'XiaomiMiMo', 'ms': 'XiaomiMiMo'},
            'minimax': {'hf': 'MiniMaxAI', 'ms': 'MiniMax'},
            'zhipu': {'hf': 'zai-org', 'ms': 'ZhipuAI'},
            'apple': {'hf': 'apple'},
            'fastino': {'hf': 'fastino'},
            'convai-innovations': {'hf': 'convaiinnovations'},
            'contrastive-lm': {'hf': 'Contrastive-LM'},
        }
        for group, accounts in expected.items():
            self.assertEqual({t['source']: t['org'] for t in self.targets if t['group'] == group}, accounts)

    def test_aliases_match_current_and_historical_catalog(self):
        catalog = self.identity.catalog([
            {'id': 'moonshotai/Kimi-K2.5', 'modelscopeUrl': 'https://modelscope.cn/models/moonshot-ai/Kimi-K2.5'},
            {'id': 'rednote-hilab/dots.llm1.inst'},
            {'id': 'MiniMaxAI/MiniMax-M2'},
        ])
        self.assertEqual(catalog[self.identity.key('ms', 'moonshotai/Kimi-K2.5')], ['moonshotai/Kimi-K2.5'])
        self.assertEqual(catalog[self.identity.key('ms', 'dots-studio/dots.llm1.inst')], ['rednote-hilab/dots.llm1.inst'])
        self.assertEqual(catalog[self.identity.key('ms', 'MiniMax/MiniMax-M2')], ['MiniMaxAI/MiniMax-M2'])

    def test_explicit_case_alias_and_unrelated_company(self):
        self.assertEqual(self.identity.key('hf', 'iFlytekOpenSource/Domux'), self.identity.key('ms', 'iflytek/domux'))
        self.assertIsNone(self.identity.key('hf', 'JDONE-Research/AIOne-Agent-52B-A36B-it'))

    def test_variants_and_publishers_stay_distinct(self):
        keys = [self.identity.key('hf', f'moonshotai/{name}') for name in ('Model', 'Model-Instruct', 'Model-FP8', 'model')]
        keys.append(self.identity.key('hf', 'dots-studio/Model'))
        self.assertEqual(len(set(keys)), 5)

    def test_two_sources_make_one_model(self):
        sources = {}
        for source in ('hf', 'ms'):
            sources[source + '/moonshotai'] = m.update_source(None, [item(source)], 't1')[0]
        grouped = m.group_models(sources, self.identity, {'moonshot/Kimi-K2.5': ['moonshotai/Kimi-K2.5']}, set(sources))
        self.assertEqual(len(grouped), 1)
        row = next(iter(grouped.values()))
        self.assertEqual(len(row['sources']), 2)
        self.assertEqual(row['preferred_source'], 'ms')
        self.assertEqual(row['catalog_status'], 'cataloged')


class PaginationTests(unittest.TestCase):
    def test_hf_follows_next_link(self):
        requests = []
        def handler(request):
            requests.append(request)
            if len(requests) == 1:
                return httpx.Response(200, json=[{'id': 'moonshotai/A', 'sha': 'a'}],
                                      headers={'Link': '<https://huggingface.co/api/models?author=moonshotai&cursor=2>; rel="next"'})
            self.assertEqual(request.url.params['cursor'], '2')
            return httpx.Response(200, json=[{'id': 'moonshotai/B', 'sha': 'b'}])
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            self.assertEqual(len(m.hf_models(client, 'moonshotai', 100, 10)), 2)
        self.assertEqual(len(requests), 2)

    def test_ms_short_page_does_not_end_before_total(self):
        pages = []
        def handler(request):
            self.assertEqual(request.url.path, '/api/v1/models')
            page = json.loads(request.content)['PageNumber']
            pages.append(page)
            return httpx.Response(200, json={'Success': True, 'Code': 200,
                'Data': {'Models': [{'Path': 'Qwen', 'Name': f'Model-{page}'}], 'TotalCount': 3}})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            self.assertEqual(len(m.ms_models(client, 'Qwen', 100, 10)), 3)
        self.assertEqual(pages, [1, 2, 3])

    def test_ms_api_error_is_not_empty_success(self):
        with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(200, json={'Success': False, 'Code': 500, 'Message': 'failed'}))) as client:
            with self.assertRaisesRegex(ValueError, 'API failure'):
                m.ms_models(client, 'Qwen', 100, 10)

    def test_ms_restarts_incomplete_listing_without_mixing_attempts(self):
        pages=[]
        def handler(request):
            self.assertEqual(request.headers['Cache-Control'], 'no-cache')
            page=json.loads(request.content)['PageNumber']
            pages.append(page)
            name='stale' if len(pages)<=2 else f'fresh-{page}'
            return httpx.Response(200,json={'Success':True,'Code':200,
                'Data':{'Models':[{'Path':'Qwen','Name':name}],'TotalCount':2}})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            result=m.ms_models(client,'Qwen',100,10)
        self.assertEqual(pages,[1,2,1,2])
        self.assertEqual({model['id'] for model in result},{'Qwen/fresh-1','Qwen/fresh-2'})

    def test_ms_incomplete_repeated_page_is_error(self):
        response = {'Success': True, 'Code': 200, 'Data': {'Models': [{'Path': 'Qwen', 'Name': 'A'}], 'TotalCount': 2}}
        with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(200, json=response))) as client:
            with self.assertRaisesRegex(ValueError, 'incomplete pagination'):
                m.ms_models(client, 'Qwen', 100, 10)

    def test_ms_null_page_is_reported_as_incomplete(self):
        response = {'Success': True, 'Code': 200, 'Data': {'Models': None, 'TotalCount': 172}}
        with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(200, json=response))) as client:
            with self.assertRaisesRegex(ValueError, 'malformed model list on page 1'):
                m.ms_models(client, 'ZhipuAI', 100, 10)

    def test_hf_page_limit_is_error(self):
        def handler(_):
            return httpx.Response(200, json=[{'id': 'moonshotai/A'}], headers={'Link': '<https://huggingface.co/api/models?cursor=2>; rel="next"'})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            with self.assertRaisesRegex(ValueError, 'pagination limit'):
                m.hf_models(client, 'moonshotai', 100, 1)


class StateTests(unittest.TestCase):
    def test_baseline_idempotency_and_repository_update(self):
        state, events, baseline = m.update_source(None, [item()], 't1')
        self.assertTrue(baseline)
        self.assertFalse(events)
        unchanged, events, baseline = m.update_source(state, [item()], 't2')
        self.assertFalse(baseline)
        self.assertFalse(events)
        changed, events, _ = m.update_source(unchanged, [item(revision='def')], 't3')
        self.assertEqual(events[0]['kind'], 'repository_updated')
        self.assertEqual(changed['repositories'][item()['id']]['first_seen'], 't1')
        self.assertEqual(state['repositories'][item()['id']]['revision'], 'abc')

    def test_absence_requires_two_successful_lists_and_reappearance(self):
        state, _, _ = m.update_source(None, [item()], 't1')
        state, events, _ = m.update_source(state, [], 't2')
        self.assertFalse(events)
        self.assertTrue(state['repositories'][item()['id']]['present'])
        state, events, _ = m.update_source(state, [], 't3')
        self.assertEqual(events[0]['kind'], 'repository_not_listed')
        state, events, _ = m.update_source(state, [item()], 't4')
        self.assertEqual(events[0]['kind'], 'repository_reappeared')
        self.assertEqual(state['repositories'][item()['id']]['missing_runs'], 0)

    def test_partial_failure_preserves_source_and_merges_new_model_events(self):
        config = m.read_json(Path(__file__).resolve().parents[1] / 'data/monitoring.example.json')
        config['groups'] = [g for g in config['groups'] if g['id'] == 'moonshot']
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'data').mkdir()
            (root / 'data/models.json').write_text('[]')
            config_path = root / 'monitoring.json'
            config_path.write_text(json.dumps(config))
            state_path = root / 'state.json'
            reports = root / 'reports'
            def fetch(target, _):
                return [item(target['source'])], 1, 0
            with patch.multiple(m, CONFIG=config_path, ROOT=root, STATE=state_path, REPORTS=reports), \
                 patch('sys.argv', ['monitor.py']), patch.object(m.subprocess, 'check_output', return_value='test-head\n'), \
                 patch.object(m, 'fetch_target', side_effect=fetch) as mock_fetch, redirect_stdout(io.StringIO()):
                m.main()
                original = m.read_json(state_path)
                def failing_fetch(target, config):
                    if target['source'] == 'ms':
                        raise ValueError('incomplete pagination')
                    return [item('hf', revision='new')], 1, 0
                mock_fetch.side_effect = failing_fetch
                self.assertEqual(m.main()['status'], 'partial')
                self.assertEqual(original['sources']['ms/moonshotai'], m.read_json(state_path)['sources']['ms/moonshotai'])
                self.assertEqual(m.read_json(reports / 'latest.json')['status'], 'partial')
                def new_model(target, config):
                    return [item(target['source'], revision='new'), item(target['source'], 'moonshotai/New-Model')], 2, 0
                mock_fetch.side_effect = new_model
                m.main()
                report = m.read_json(reports / 'latest.json')
                new_events = [event for event in report['events'] if event['kind'] == 'model_discovered']
                self.assertEqual(len(new_events), 1)
                self.assertEqual(len(new_events[0]['changes']), 2)
                self.assertEqual(report['model_count'], 2)
                m.main()
                self.assertFalse(m.read_json(reports / 'latest.json')['events'])


if __name__ == '__main__':
    unittest.main()
