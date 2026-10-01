"""Source-aware ModelSheet monitoring. Catalog data stays reviewable and separate."""
import copy
import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

import httpx
from modelsheet_cli.filters import skip_reason
from modelsheet_cli.categories import model_category
from modelsheet_cli.scanner import load_ms_name_rewrites, rewrite_ms_name

from .config import PROJECT_ROOT as ROOT
from .monitor_store import home

CONFIG = home() / 'config.json'
STATE = home() / 'state/monitor-state.json'
REPORTS = home() / 'reports'
BASE = {'hf': 'https://huggingface.co', 'ms': 'https://modelscope.cn'}


def read_json(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(path)


def request(client, method, url, **kwargs):
    for attempt in range(3):
        try:
            response = client.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except (httpx.TransportError, httpx.HTTPStatusError) as error:
            retryable = (not isinstance(error, httpx.HTTPStatusError)
                         or error.response.status_code in {429, 500, 502, 503, 504})
            if not retryable or attempt == 2:
                raise
            time.sleep(attempt + 1)


def hf_models(client, org, size, max_pages):
    url = BASE['hf'] + '/api/models'
    params = {'author': org, 'limit': size, 'sort': 'lastModified',
              'direction': -1, 'full': 'false'}
    models = {}
    for _ in range(max_pages):
        response = request(client, 'GET', url, params=params)
        data = response.json()
        if not isinstance(data, list):
            raise ValueError('HF returned a non-list model response')
        for item in data:
            mid = item['id']
            if mid.split('/')[0].casefold() != org.casefold():
                raise ValueError(f'HF returned a model outside requested account: {mid}')
            models[mid] = {'id': mid, 'source': 'hf', 'url': BASE['hf'] + '/' + mid,
                           'revision': item.get('sha'), 'updated_at': item.get('lastModified'),
                           'created_at': item.get('createdAt'),
                           'pipeline_tag': item.get('pipeline_tag'), 'tags': item.get('tags', [])}
        next_url = response.links.get('next', {}).get('url')
        if not next_url:
            return list(models.values())
        if urlsplit(next_url).netloc != 'huggingface.co' or next_url == url:
            raise ValueError('Invalid HF pagination link')
        url, params = next_url, None
    raise ValueError('HF pagination limit reached; incomplete source was not committed')


def ms_models(client, org, size, max_pages):
    # Listings can change between pages. Retry once from a fresh first page;
    # an incomplete second attempt still leaves the previous baseline intact.
    for attempt in range(2):
        try:
            return _ms_models(client, org, size, max_pages)
        except ValueError:
            if attempt:
                raise


def _ms_models(client, org, size, max_pages):
    models = {}
    for page in range(1, max_pages + 1):
        # Use the canonical path so paginated PUT bodies are sent directly.
        response = request(client, 'PUT', BASE['ms'] + '/api/v1/models',
                           json={'Path': org, 'PageNumber': page, 'PageSize': size},
                           headers={'Cache-Control': 'no-cache'})
        data = response.json()
        if data.get('Success') is not True or data.get('Code') != 200:
            raise ValueError(f"ModelScope API failure: {data.get('Code')} {data.get('Message')}")
        payload = data['Data']
        if not isinstance(payload, dict) or not isinstance(payload.get('Models'), list):
            raise ValueError(f'ModelScope malformed model list on page {page}; incomplete source was not committed')
        items, total = payload['Models'], int(payload['TotalCount'])
        before = len(models)
        for item in items:
            if item['Path'].casefold() != org.casefold():
                raise ValueError('ModelScope returned a model outside requested account')
            mid = item['Path'] + '/' + item['Name']
            tasks = item.get('Tasks') or []
            task = tasks[0].get('Name') if tasks and isinstance(tasks[0], dict) else None
            models[mid] = {'id': mid, 'source': 'ms', 'url': BASE['ms'] + '/models/' + mid,
                           'revision': item.get('Revision'), 'updated_at': item.get('LastUpdatedTime'),
                           'created_at': item.get('CreatedTime'), 'pipeline_tag': task,
                           'tags': item.get('Tags') or []}
        if len(models) >= total:
            return list(models.values())
        # Do not mistake a server-clamped page size or failed page for end of data.
        if not items or len(models) == before:
            raise ValueError(f'ModelScope incomplete pagination: {len(models)} of {total}')
    raise ValueError('ModelScope pagination limit reached; incomplete source was not committed')


class Identity:
    def __init__(self, config):
        self.groups = {g['id']: g for g in config['groups']}
        if len(self.groups) != len(config['groups']):
            raise ValueError('Duplicate monitoring group IDs')
        self.accounts = {}
        self.rewrites = {k.casefold(): v for k, v in load_ms_name_rewrites().items()}
        for group in config['groups']:
            for source in ('hf', 'ms'):
                for org in group.get('aliases', {}).get(source, []) + group['monitor'].get(source, []):
                    key = (source, org.casefold())
                    if key in self.accounts and self.accounts[key] != group['id']:
                        raise ValueError(f'Account belongs to two groups: {key}')
                    self.accounts[key] = group['id']

    def key(self, source, mid):
        if '/' not in mid:
            return None
        org, name = mid.split('/', 1)
        group_id = self.accounts.get((source, org.casefold()))
        if not group_id:
            return None
        group = self.groups[group_id]
        name = group.get('model_aliases', {}).get(f'{source}/{mid}', name)
        if source == 'ms':
            name = rewrite_ms_name(org + '/' + name, self.rewrites.get(org.casefold(), {})).split('/', 1)[-1]
        # Keep model-name case, variants, quantization, and fine-tune suffixes.
        return group_id + '/' + name

    def catalog(self, models):
        result = {}
        for model in models:
            refs = [('hf', model['id']), ('ms', model['id'])]
            for source, field in [('hf', 'huggingfaceUrl'), ('ms', 'modelscopeUrl')]:
                if model.get(field):
                    parts = unquote(urlsplit(model[field]).path).strip('/').split('/')
                    if source == 'ms' and parts[:1] == ['models']:
                        parts = parts[1:]
                    if len(parts) >= 2:
                        refs.append((source, '/'.join(parts[:2])))
            for source, mid in refs:
                key = self.key(source, mid)
                if key:
                    result.setdefault(key, set()).add(model['id'])
        return {k: sorted(v) for k, v in result.items()}


def version(item):
    return item.get('revision'), item.get('updated_at')


def update_source(old, observations, now, missing_confirmations=2):
    """Apply only a complete successful source listing; preserve absence evidence."""
    previous = (old or {}).get('repositories', {})
    repositories = copy.deepcopy(previous)
    events = []
    baseline = old is None
    current = {m['id']: m for m in observations}
    for mid, item in current.items():
        prior = previous.get(mid)
        record = dict(item, first_seen=prior.get('first_seen', now) if prior else now,
                      last_seen=now, present=True, missing_runs=0)
        repositories[mid] = record
        kind = None
        if prior is None and not baseline:
            kind = 'repository_added'
        elif prior and not prior.get('present', True):
            kind = 'repository_reappeared'
        elif prior and version(prior) != version(item):
            kind = 'repository_updated'
        if kind:
            events.append({'kind': kind, 'source': item['source'], 'id': mid,
                           'previous_version': list(version(prior)) if prior else None,
                           'version': list(version(item))})
    for mid, prior in previous.items():
        if mid in current:
            continue
        record = repositories[mid]
        record['missing_runs'] = prior.get('missing_runs', 0) + 1
        record.setdefault('not_listed_since', now)
        if record['missing_runs'] >= missing_confirmations and prior.get('present', True):
            record['present'] = False
            events.append({'kind': 'repository_not_listed', 'source': record['source'], 'id': mid})
    return {'last_success': now, 'baseline_at': (old or {}).get('baseline_at', now),
            'repositories': repositories}, events, baseline


def group_models(sources, identity, catalog, targets):
    groups = {}
    for target, state in sources.items():
        if target not in targets:
            continue
        for item in state.get('repositories', {}).values():
            key = identity.key(item['source'], item['id'])
            if not key:
                continue
            row = groups.setdefault(key, {'model_key': key, 'group': key.split('/')[0],
                                          'modelCategory': model_category(item['id']),
                                          'catalog_ids': catalog.get(key, []), 'sources': []})
            row['sources'].append(item)
    for row in groups.values():
        priority = identity.groups[row['group']].get('preferred_source', 'hf')
        row['sources'].sort(key=lambda s: (not s.get('present', True), s['source'] != priority, s['source'], s['id']))
        row['preferred_source'] = row['sources'][0]['source']
        row['preferred_id'] = row['sources'][0]['id']
        row['catalog_status'] = 'cataloged' if row['catalog_ids'] else 'needs_review'
    return groups


def validate_config(config):
    identity = Identity(config)
    targets = []
    for group in config['groups']:
        for source, orgs in group['monitor'].items():
            if source not in BASE:
                raise ValueError('Unknown source: ' + source)
            for org in orgs:
                if not org or '/' in org or any(c.isspace() for c in org):
                    raise ValueError('Invalid organization: ' + org)
                targets.append({'group': group['id'], 'source': source, 'org': org,
                                'key': source + '/' + org})
    if not targets or len({t['key'] for t in targets}) != len(targets):
        raise ValueError('Empty or duplicated monitoring targets')
    return identity, targets


def fetch_target(target, config):
    with httpx.Client(timeout=config['request_timeout_seconds'], follow_redirects=True,
                      headers={'User-Agent': 'ModelSheet-monitor/2.0'}) as client:
        fetch = hf_models if target['source'] == 'hf' else ms_models
        models = fetch(client, target['org'], config['page_size'], config['max_pages'])
    if not models:
        # Every configured active publisher was verified to have public models.
        # An empty author query can mean a moved/misspelled account, not no updates.
        raise ValueError('Configured account returned zero repositories; check account move or source availability')
    kept = [m for m in models if not skip_reason(m['id'], pipeline_tag=m.get('pipeline_tag'), tags=m.get('tags'))]
    return kept, len(models), len(models) - len(kept)


def write_inventory(config, report):
    lines = ['# ModelSheet 每日监控', '',
             f"运行时间：{report['finished_at']}；状态：{report['status']}。", '',
             f"计划：{config['schedule']}，{config['schedule_timezone']}；配置：{CONFIG}。",
             'monitor 是实际请求的账号；aliases 仅供跨平台和历史记录匹配，不触发额外请求。', '',
             '| 厂商或项目 | Hugging Face | ModelScope |', '|---|---|---|']
    for group in config['groups']:
        lines.append(f"| {group['name']} | {', '.join(group['monitor'].get('hf', [])) or '不监控'} | {', '.join(group['monitor'].get('ms', [])) or '不监控'} |")
    lines += ['', f"{len(config['groups'])} 个监控组，{len(report['targets'])} 个来源查询。",
              '每个模型一条合并记录，各来源分别保存 ID、URL、版本、更新时间和出现状态。',
              '同名归并仅发生在明确配置的同一发布组中；量化、微调、Base、Instruct 等变体保留区别。',
              '首次运行建立版本基线；后续区分新模型、新增发布来源和仓库更新。',
              '仓库更新可能是权重、配置或文档变更，不能据此判断推理服务是否可用。',
              '空账号、API 错误或分页不完整会报告异常并保留上次成功状态；连续两次完整查询未列出才标记“未列出”。',
              '候选只进入审查清单，不自动修改模型参数目录或线上数据库。', '',
              f"本轮合并模型数：{report['model_count']}；待审查：{report['pending_candidate_count']}；变化事件：{len(report['events'])}。",
              '详细来源状态、模型清单与事件见 latest.json。历史 v1 候选和状态保留在原部署目录及迁移备份中。']
    (REPORTS / 'monitored-organizations.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    review = ['# ModelSheet 审查任务', '',
              f"更新时间：{report['finished_at']}；扫描状态：{report['status']}。", '',
              '待审查数包括首次完整扫描发现的历史仓库，并不代表今日新发布。',
              '候选沿用项目排除规则，仍可能包含需人工排除的组件和非目标模型。', '',
              '| 发布组 | 合并模型 | 未入库候选 |', '|---|---:|---:|']
    for group in config['groups']:
        models = [row for row in report['models'] if row['group'] == group['id']]
        review.append(f"| {group['name']} | {len(models)} | {sum(not row['catalog_ids'] for row in models)} |")
    review += ['', '## 本轮变化', '']
    review += [f"- {e['kind']}: {e['model_key']}（{len(e['changes'])} 条来源变化）" for e in report['events']] or ['无变化事件；新增来源首次扫描只建立基线。']
    review += ['', '## 来源异常', '']
    review += [f"- {t['key']}: {t['error']}" for t in report['targets'] if t['status'] == 'error'] or ['无。']
    review += ['', '## 目录中待人工确认的重复身份', '',
               '以下 ID 按已确认的组织别名和相同模型名匹配到同一身份；合并目录前仍需核对参数和来源。', '']
    review += [f"- {row['model_key']}: {', '.join(row['catalog_ids'])}" for row in report['catalog_duplicates']] or ['无。']
    review += ['', '完整候选及每个平台的 URL、版本、更新时间见 latest.json；本任务不自动发布目录变更。']
    (REPORTS / 'review-summary.md').write_text('\n'.join(review) + '\n', encoding='utf-8')


def main():
    config = read_json(CONFIG)
    identity, targets = validate_config(config)
    now = datetime.now(timezone.utc).isoformat()
    old = read_json(STATE, {'schema_version': 2, 'sources': {}})
    sources = copy.deepcopy(old['sources'])
    catalog = identity.catalog(read_json(ROOT / 'data/models.json'))
    target_keys = {t['key'] for t in targets}
    previous_groups = group_models(old['sources'], identity, catalog, target_keys)
    events, statuses, baselines = [], [], []
    with ThreadPoolExecutor(max_workers=config['workers']) as executor:
        tasks = {executor.submit(fetch_target, t, config): t for t in targets}
        for future in as_completed(tasks):
            target = tasks[future]
            try:
                models, raw_count, excluded = future.result()
                state, delta, baseline = update_source(sources.get(target['key']), models, now,
                                                       config['missing_confirmations'])
                sources[target['key']] = state
                events.extend(delta)
                if baseline:
                    baselines.append(target['key'])
                statuses.append(dict(target, status='success', fetched=raw_count,
                                     kept=len(models), excluded=excluded))
                print(f"{target['key']}: {raw_count} repositories, {len(models)} after filters", flush=True)
            except Exception as error:
                statuses.append(dict(target, status='error', error=str(error),
                                     last_success=sources.get(target['key'], {}).get('last_success')))
                print(f"{target['key']}: ERROR {error}", flush=True)
    grouped = group_models(sources, identity, catalog, target_keys)
    for event in events:
        event['model_key'] = identity.key(event['source'], event['id'])
        if event['kind'] == 'repository_added':
            key = event['model_key']
            event['kind'] = 'source_added' if key in previous_groups or key in catalog else 'model_discovered'
    # One notification per logical change kind and model; retain affected sources.
    merged_events = {}
    for event in events:
        key = (event['kind'], event['model_key'])
        merged_events.setdefault(key, {'kind': key[0], 'model_key': key[1], 'changes': []})['changes'].append(event)
    report = {
        'schema_version': 2, 'started_at': now,
        'finished_at': datetime.now(timezone.utc).isoformat(),
        'status': 'partial' if any(t['status'] == 'error' for t in statuses) else 'success',
        'mode': 'grouped-source-monitor-and-review',
        'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'source_dirty': bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip()),
        'config': config,
        'target_count': len(targets), 'group_count': len(config['groups']),
        'catalog_model_count': len(read_json(ROOT / 'data/models.json')),
        'targets': sorted(statuses, key=lambda t: t['key']),
        'baseline_sources': sorted(baselines), 'model_count': len(grouped),
        'events': sorted(merged_events.values(), key=lambda e: (e['kind'], e['model_key'])),
        'models': sorted(grouped.values(), key=lambda m: m['model_key']),
        'pending_candidates': sorted([g for g in grouped.values() if not g['catalog_ids']], key=lambda m: m['model_key']),
        'catalog_duplicates': sorted([g for g in grouped.values() if len(g['catalog_ids']) > 1], key=lambda m: m['model_key']),
        'limits': ['Repository changes do not prove weight changes or inference health.',
                   'Source lists are paginated; reaching the configured page limit is an error.',
                   'Historical v1 pending records remain preserved separately.'],
    }
    report['pending_candidate_count'] = len(report['pending_candidates'])
    atomic_json(REPORTS / (datetime.now(timezone.utc).strftime('%Y-%m-%dT%H-%M-%S.%fZ') + '.json'), report)
    atomic_json(STATE, {'schema_version': 2, 'updated_at': report['finished_at'], 'sources': sources})
    atomic_json(REPORTS / 'latest.json', report)
    write_inventory(config, report)
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    for path in REPORTS.glob('20*.json'):
        if datetime.fromtimestamp(path.stat().st_mtime, timezone.utc) < cutoff:
            path.unlink()
    print(json.dumps({k: report[k] for k in ['status', 'group_count', 'target_count',
          'model_count', 'pending_candidate_count']}, ensure_ascii=False))
    return report
