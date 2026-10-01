"""One local configuration and process lock for native monitoring commands."""
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import sqlite3
from zoneinfo import ZoneInfo

from .config import PROJECT_ROOT


def home():
    return Path(os.environ.get('MODELSHEET_MONITOR_HOME', PROJECT_ROOT / '.modelsheet/monitor')).expanduser().resolve()


def config_file():
    return home() / 'config.json'


def load():
    if not config_file().exists():
        raise ValueError('Monitoring is not initialized. Run: modelsheet monitor init')
    return json.loads(config_file().read_text(encoding='utf-8'))


def validate(config):
    from .monitor import validate_config
    if config.get('schema_version') != 2:
        raise ValueError('Expected monitoring config schema_version=2')
    for key, upper in [('page_size', 100), ('max_pages', 1000), ('workers', 16),
                       ('request_timeout_seconds', 300), ('missing_confirmations', 100)]:
        value = config.get(key)
        if type(value) is not int or not 1 <= value <= upper:
            raise ValueError(f'{key} must be an integer from 1 to {upper}')
    calendar(config)
    return validate_config(config)


def calendar(config):
    match = re.fullmatch(r'([01]\d|2[0-3]):([0-5]\d) daily', config.get('schedule', ''))
    if not match:
        raise ValueError('Schedule must be HH:MM daily')
    zone = config.get('schedule_timezone', '')
    if not re.fullmatch(r'[A-Za-z0-9_+/-]+', zone):
        raise ValueError('Invalid timezone')
    ZoneInfo(zone)
    return f"*-*-* {match[1]}:{match[2]}:00 {zone}"


def save(config):
    from .monitor import atomic_json
    validate(config)
    atomic_json(config_file(), config)


@contextmanager
def locked():
    """SQLite process lock also works on systems without fcntl; no stale PID files."""
    home().mkdir(parents=True, exist_ok=True, mode=0o700)
    conn = sqlite3.connect(home() / '.control.sqlite', timeout=0)
    try:
        try:
            conn.execute('BEGIN IMMEDIATE')
        except sqlite3.OperationalError as error:
            raise ValueError('Another ModelSheet monitor command is running; retry after it finishes.') from error
        yield
    finally:
        conn.rollback()
        conn.close()


def set_source(group_id, source, org, name=None):
    return set_sources(group_id, {source: org}, name)


def set_sources(group_id, accounts, name=None):
    if not accounts or any(source not in ('hf', 'ms') for source in accounts):
        raise ValueError('Provide at least one hf or ms account')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*', group_id):
        raise ValueError('Use a stable group ID containing letters, digits, dots, underscores or hyphens')
    with locked():
        config = load()
        group = next((g for g in config['groups'] if g['id'] == group_id), None)
        if group is None:
            group = {'id': group_id, 'name': name or group_id, 'monitor': {}, 'aliases': {}}
            config['groups'].append(group)
        if name:
            group['name'] = name
        for source, org in accounts.items():
            aliases = group.setdefault('aliases', {}).setdefault(source, [])
            for old in group['monitor'].get(source, []) + [org]:
                if old not in aliases:
                    aliases.append(old)
            group['monitor'][source] = [org]
        save(config)


def remove_source(group_id, source=None):
    with locked():
        config = load()
        group = next((g for g in config['groups'] if g['id'] == group_id), None)
        if group is None:
            raise ValueError('Unknown group: ' + group_id)
        if source and source not in ('hf', 'ms'):
            raise ValueError('Source must be hf or ms')
        for key in ([source] if source else list(group['monitor'])):
            aliases = group.setdefault('aliases', {}).setdefault(key, [])
            for org in group['monitor'].pop(key, []):
                if org not in aliases:
                    aliases.append(org)
        # Keep identity aliases and historical state even when a group is disabled.
        save(config)
