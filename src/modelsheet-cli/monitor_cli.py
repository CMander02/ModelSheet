"""ModelSheet owns monitoring sources, scan state, review tasks and scheduling."""
from functools import wraps
import json
from pathlib import Path
import shutil
import subprocess
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from .config import PROJECT_ROOT
from . import monitor_store as store

app = typer.Typer(help='Manage HF/MS monitoring, review tasks and the background schedule.',
                  no_args_is_help=True, pretty_exceptions_show_locals=False)
console = Console()


def guarded(fn):
    @wraps(fn)
    def call(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
            message = error.stderr if isinstance(error, subprocess.CalledProcessError) else str(error)
            typer.echo('Monitor error: ' + (message or str(error)), err=True)
            raise typer.Exit(1) from error
    return call


def emit(value):
    typer.echo(json.dumps(value, ensure_ascii=False, indent=2))


@app.command('init')
@guarded
def initialize(
    from_config: Optional[Path] = typer.Option(None, '--from', help='Import a schema-v2 config; defaults to the project example.'),
    state_from: Optional[Path] = typer.Option(None, '--state-from', help='Import an existing v2 source baseline.'),
    reports_from: Optional[Path] = typer.Option(None, '--reports-from', help='Copy existing reports without resetting observations.'),
):
    """Initialize once, optionally migrating existing monitoring data."""
    from .monitor import atomic_json
    config = json.loads((from_config or PROJECT_ROOT / 'data/monitoring.example.json').read_text(encoding='utf-8'))
    store.validate(config)
    state = json.loads(state_from.read_text(encoding='utf-8')) if state_from else None
    if state is not None and (state.get('schema_version') != 2 or not isinstance(state.get('sources'), dict)):
        raise ValueError('Only schema-v2 source state can be imported')
    if reports_from and not reports_from.is_dir():
        raise ValueError('Reports source must be a directory')
    with store.locked():
        if store.config_file().exists():
            raise ValueError('Already initialized; use monitor add/remove/schedule to change the current configuration')
        if reports_from:
            shutil.copytree(reports_from, store.home() / 'reports', dirs_exist_ok=True)
        if state is not None:
            atomic_json(store.home() / 'state/monitor-state.json', state)
        store.save(config)
    typer.echo(f'Initialized {store.config_file()}')


@app.command('list')
@guarded
def list_sources(as_json: bool = typer.Option(False, '--json')):
    """List the actual source accounts used by scheduled and manual monitoring."""
    config = store.load()
    if as_json:
        emit(config['groups'])
        return
    table = Table('Group', 'Name', 'HF', 'ModelScope')
    for group in config['groups']:
        table.add_row(group['id'], group['name'], ', '.join(group['monitor'].get('hf', [])),
                      ', '.join(group['monitor'].get('ms', [])))
    console.print(table)


@app.command('add')
@guarded
def add_source(group: str, hf: Optional[str] = typer.Option(None, '--hf'),
               ms: Optional[str] = typer.Option(None, '--ms'),
               name: Optional[str] = typer.Option(None, '--name')):
    """Add/update a group's accounts. Account renames retain old identity aliases."""
    store.set_sources(group, {key: value for key, value in [('hf', hf), ('ms', ms)] if value}, name)
    typer.echo('Updated monitoring group: ' + group)


@app.command('remove')
@guarded
def remove_source(group: str, source: Optional[str] = typer.Option(None, '--source')):
    """Disable one source or an entire group, preserving aliases and history."""
    store.remove_source(group, source)
    typer.echo('Disabled requested monitoring sources for: ' + group)


@app.command('check')
@guarded
def check():
    """Validate source identity mappings and scheduler settings without scanning."""
    config = store.load()
    _, targets = store.validate(config)
    emit({'config': str(store.config_file()), 'groups': len(config['groups']), 'targets': len(targets),
          'calendar': store.calendar(config)})


@app.command('run')
@guarded
def run(build_db: bool = typer.Option(False, '--build-db')):
    """Run one complete scan, persist changes and update the review queue."""
    from . import monitor
    with store.locked():
        store.validate(store.load())
        if build_db:
            import sys
            for command in ('build', 'verify'):
                subprocess.run([sys.executable, '-m', 'modelsheet_cli', 'db', command], cwd=PROJECT_ROOT, check=True)
        report = monitor.main()
    if report['status'] != 'success':
        raise typer.Exit(2)


@app.command('update')
@guarded
def update(skip_dirty: bool = typer.Option(False, '--skip-dirty')):
    """Fast-forward a clean project and sync frozen dependencies; never discard edits."""
    with store.locked():
        dirty = subprocess.check_output(['git', 'status', '--porcelain'], cwd=PROJECT_ROOT, text=True).strip()
        if dirty:
            if skip_dirty:
                typer.echo('Local source changes present: using current code; Git update skipped.')
                return
            raise ValueError('Local source changes present; preserve/review them before updating')
        subprocess.run(['git', 'pull', '--ff-only'], cwd=PROJECT_ROOT, check=True)
        uv = shutil.which('uv') or str(Path.home() / '.local/bin/uv')
        subprocess.run([uv, 'sync', '--frozen'], cwd=PROJECT_ROOT, check=True)


@app.command('start')
@guarded
def start():
    """Install and enable the background timer. Use run for an immediate scan."""
    from .monitor_service import start as service_start
    service_start()
    typer.echo('ModelSheet monitoring timer enabled.')


@app.command('stop')
@guarded
def stop():
    """Disable future scheduled runs and stop any active scheduled scan."""
    from .monitor_service import stop as service_stop
    service_stop()
    typer.echo('ModelSheet monitoring timer stopped.')


@app.command('schedule')
@guarded
def schedule(at: str = typer.Option(..., '--at', help='Daily time, HH:MM'),
             timezone: str = typer.Option('Asia/Shanghai', '--timezone')):
    """Change the daily schedule and reload installed units without enabling a stopped timer."""
    from . import monitor_service as service
    with store.locked():
        config = store.load()
        config.update(schedule=at + ' daily', schedule_timezone=timezone)
        store.validate(config)
        installed = (service.unit_dir() / (service.UNIT + '.timer')).exists()
        if installed:
            service.install(config)
        store.save(config)
    typer.echo(store.calendar(config))


@app.command('status')
@guarded
def status():
    """Show scheduler state, configuration and latest scan results as JSON."""
    from . import monitor_service as service
    from .monitor import read_json
    config = store.load()
    _, targets = store.validate(config)
    latest = read_json(store.home() / 'reports/latest.json', {})
    emit({'home': str(store.home()), 'groups': len(config['groups']), 'sources': len(targets),
          'calendar': store.calendar(config), 'scheduler': service.status(),
          'last_scan': {key: latest.get(key) for key in ['status', 'finished_at', 'source_commit', 'source_dirty',
              'model_count', 'pending_candidate_count']},
          'failed_sources': [target for target in latest.get('targets', []) if target['status'] != 'success']})


@app.command('tasks')
@guarded
def tasks(group: Optional[str] = typer.Option(None, '--group'),
          events: bool = typer.Option(False, '--events'),
          limit: int = typer.Option(30, '--limit', min=1),
          as_json: bool = typer.Option(False, '--json')):
    """List pending catalog review candidates, or the latest change events."""
    from .monitor import read_json
    latest = read_json(store.home() / 'reports/latest.json', {})
    rows = latest.get('events' if events else 'pending_candidates', [])
    if group:
        rows = [row for row in rows if row['model_key'].split('/')[0] == group]
    if as_json:
        emit({'total': len(rows), 'shown': min(limit, len(rows)), 'items': rows[:limit]})
        return
    table = Table('Model', 'Change' if events else 'Sources')
    for row in rows[:limit]:
        table.add_row(row['model_key'], row['kind'] if events else ', '.join(s['source'] for s in row['sources']))
    console.print(table)
    typer.echo(f'{len(rows)} tasks; showing up to {limit}. Candidates include historical repositories needing review.')


@app.command('history')
@guarded
def history(limit: int = typer.Option(10, '--limit', min=1)):
    """List completed scan reports, including partial failures."""
    from .monitor import read_json
    rows = []
    for path in sorted((store.home() / 'reports').glob('20*.json'), reverse=True)[:limit]:
        report = read_json(path)
        rows.append({key: report.get(key) for key in ['finished_at', 'status', 'target_count', 'model_count']})
    emit(rows)


@app.command('logs')
@guarded
def logs(lines: int = typer.Option(50, '--lines', min=1)):
    """Show scheduled scan logs from the user journal."""
    from .monitor_service import UNIT
    subprocess.run(['journalctl', '--user', '-u', UNIT + '.service', '-n', str(lines), '--no-pager'], check=True)


def legacy_watchlist(action, orgs, hf, ms):
    """Existing watchlist commands share native configuration once initialized."""
    if action == 'list':
        return list_sources(False)
    if action == 'search':
        return run(False)
    if action not in ('add', 'remove') or not orgs:
        raise ValueError('Usage: modelsheet watchlist add/remove/list/search; use monitor add for different HF/MS account names')
    for org in orgs:
        config = store.load()
        matches = [g for g in config['groups'] if g['id'] == org or any(
            org.casefold() == account.casefold() for accounts in g.get('aliases', {}).values() for account in accounts)]
        if len(matches) > 1:
            raise ValueError('Ambiguous organization; use monitor add/remove with a group ID')
        group = matches[0]['id'] if matches else org
        if action == 'remove':
            store.remove_source(group)
        else:
            sources = ['hf', 'ms'] if hf and ms else ['ms'] if ms else ['hf']
            existing = matches[0] if matches else {}
            accounts = {source: (existing.get('monitor', {}).get(source)
                        or existing.get('aliases', {}).get(source) or [org])[0] for source in sources}
            store.set_sources(group, accounts)
    typer.echo('Updated native monitoring configuration.')
