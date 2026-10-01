"""Native CLI migration, shared configuration, locking and managed service regressions."""
import json
import os
import shutil
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from typer.testing import CliRunner

from modelsheet_cli.cli import app
from modelsheet_cli import monitor_service as service, monitor_store as store
from modelsheet_cli.scanner import get_scan_orgs_from_watchlist


class NativeMonitorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.env = patch.dict(os.environ, {'MODELSHEET_MONITOR_HOME': str(self.root / 'monitor'),
                                           'XDG_CONFIG_HOME': str(self.root / 'xdg')})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.runner = CliRunner()

    def invoke(self, args, code=0):
        result = self.runner.invoke(app, args)
        self.assertEqual(result.exit_code, code, result.output + str(result.exception or ''))
        return result

    def initialize(self):
        self.invoke(['monitor', 'init'])

    def test_migration_preserves_baseline_and_refuses_overwrite(self):
        state = {'schema_version': 2, 'sources': {'hf/Qwen': {'baseline_at': 'old', 'repositories': {}}}}
        state_path = self.root / 'old-state.json'
        state_path.write_text(json.dumps(state))
        reports = self.root / 'old-reports'
        reports.mkdir()
        (reports / 'latest.json').write_text('{"status":"success"}')
        self.invoke(['monitor', 'init', '--state-from', str(state_path), '--reports-from', str(reports)])
        self.assertEqual(json.loads((store.home() / 'state/monitor-state.json').read_text()), state)
        self.assertEqual((store.home() / 'reports/latest.json').read_text(), '{"status":"success"}')
        self.invoke(['monitor', 'init'], code=1)
        self.assertEqual(len(store.validate(store.load())[1]), 35)

    def test_invalid_state_does_not_initialize(self):
        path = self.root / 'old.json'
        path.write_text('{"schema_version":1}')
        self.invoke(['monitor', 'init', '--state-from', str(path)], code=1)
        self.assertFalse(store.config_file().exists())

    def test_source_changes_and_legacy_watchlist_share_one_config(self):
        self.initialize()
        self.invoke(['monitor', 'add', 'example', '--hf', 'ExampleHF', '--ms', 'ExampleMS'])
        self.assertIn(('ms', 'ExampleMS'), get_scan_orgs_from_watchlist())
        self.assertIn('ExampleHF', self.invoke(['watchlist', 'list']).output)
        self.invoke(['watchlist', 'add', 'MiniMaxAI', '--modelscope'])
        minimax = next(g for g in store.load()['groups'] if g['id'] == 'minimax')
        self.assertEqual(minimax['monitor'], {'ms': ['MiniMax'], 'hf': ['MiniMaxAI']})
        self.invoke(['monitor', 'add', 'example', '--hf', 'RenamedHF'])
        self.invoke(['monitor', 'remove', 'example', '--source', 'ms'])
        group = next(g for g in store.load()['groups'] if g['id'] == 'example')
        self.assertEqual(group['monitor'], {'hf': ['RenamedHF']})
        self.assertIn('ExampleHF', group['aliases']['hf'])
        self.assertIn('ExampleMS', group['aliases']['ms'])
        self.assertNotIn(('ms', 'ExampleMS'), get_scan_orgs_from_watchlist())

    def test_alias_collision_does_not_change_config(self):
        self.initialize()
        before = store.config_file().read_bytes()
        self.invoke(['monitor', 'add', 'wrong-owner', '--hf', 'Qwen'], code=1)
        self.assertEqual(before, store.config_file().read_bytes())

    def test_parallel_writer_is_rejected_and_lock_releases(self):
        self.initialize()
        with store.locked():
            result = self.invoke(['monitor', 'add', 'example', '--hf', 'ExampleHF'], code=1)
            self.assertIn('Another ModelSheet monitor command', result.output)
        self.invoke(['monitor', 'add', 'example', '--hf', 'ExampleHF'])

    def test_run_returns_failure_for_partial_report(self):
        self.initialize()
        with patch('modelsheet_cli.monitor.main', return_value={'status': 'partial'}):
            self.invoke(['monitor', 'run'], code=2)
        with patch('modelsheet_cli.monitor.main', return_value={'status': 'success'}) as scan:
            self.invoke(['watchlist', 'search'])
            scan.assert_called_once()

    def test_schedule_validation_and_managed_units(self):
        self.initialize()
        self.invoke(['monitor', 'schedule', '--at', '25:00'], code=1)
        self.assertEqual(store.load()['schedule'], '06:00 daily')
        self.invoke(['monitor', 'schedule', '--at', '07:15', '--timezone', 'Europe/Berlin'])
        with patch.object(service, 'systemctl') as ctl:
            self.invoke(['monitor', 'start'])
            self.assertIn(('enable', '--now', 'modelsheet-monitor.timer'), [call.args for call in ctl.call_args_list])
            text = (service.unit_dir() / 'modelsheet-monitor.timer').read_text()
            self.assertIn('OnCalendar=*-*-* 07:15:00 Europe/Berlin', text)
            service_text = (service.unit_dir() / 'modelsheet-monitor.service').read_text()
            self.assertIn('-m modelsheet_cli monitor run --build-db', service_text)
            self.assertNotIn('/Services/', service_text)
            self.assertIn(service.quote('MODELSHEET_MONITOR_HOME=' + str(store.home())), service_text)
            self.invoke(['monitor', 'stop'])
            self.assertIn(('disable', '--now', 'modelsheet-monitor.timer'), [call.args for call in ctl.call_args_list])

    def test_start_refuses_unmanaged_unit(self):
        self.initialize()
        service.unit_dir().mkdir(parents=True)
        path = service.unit_dir() / 'modelsheet-monitor.service'
        path.write_text('a manually managed unit')
        self.invoke(['monitor', 'start'], code=1)
        self.assertEqual(path.read_text(), 'a manually managed unit')

    def test_unit_escaping(self):
        self.assertEqual(service.quote('a"b%$c', True), '"a\\"b%%$$c"')
        with self.assertRaises(ValueError):
            service.quote('value\nExecStart=bad')

    @unittest.skipUnless(shutil.which('systemd-analyze'), 'systemd validation requires systemd-analyze')
    def test_generated_units_pass_systemd_parser(self):
        self.initialize()
        paths = []
        for name, text in service.units(store.load()).items():
            path = self.root / name
            path.write_text(text)
            paths.append(str(path))
        result = subprocess.run(['systemd-analyze', '--user', 'verify', *paths], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_tasks_filter_and_limit(self):
        self.initialize()
        reports = store.home() / 'reports'
        reports.mkdir()
        (reports / 'latest.json').write_text(json.dumps({'pending_candidates': [
            {'model_key': 'qwen/One', 'sources': [{'source': 'hf'}]},
            {'model_key': 'qwen/Two', 'sources': [{'source': 'ms'}]},
            {'model_key': 'minimax/Other', 'sources': [{'source': 'ms'}]},
        ]}))
        result = self.invoke(['monitor', 'tasks', '--group', 'qwen', '--limit', '1', '--json'])
        data = json.loads(result.output)
        self.assertEqual((data['total'], data['shown']), (2, 1))

    def test_update_preserves_dirty_worktree(self):
        with patch('modelsheet_cli.monitor_cli.subprocess.check_output', return_value=' M source.py\n'), \
             patch('modelsheet_cli.monitor_cli.subprocess.run') as run:
            self.invoke(['monitor', 'update', '--skip-dirty'])
            run.assert_not_called()
            self.invoke(['monitor', 'update'], code=1)
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
