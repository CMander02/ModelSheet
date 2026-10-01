"""Generate and manage a user systemd timer; never require a separate server script."""
import os
from pathlib import Path
import subprocess
import sys

from .config import PROJECT_ROOT
from . import monitor_store as store

UNIT = 'modelsheet-monitor'
MARKER = '# Managed by ModelSheet CLI'


def unit_dir():
    return Path(os.environ.get('XDG_CONFIG_HOME', Path.home() / '.config')) / 'systemd/user'


def quote(value, executable=False):
    value = str(value)
    if any(c in value for c in '\n\r\x00'):
        raise ValueError('Unit values cannot contain control characters')
    value = value.replace('\\', '\\\\').replace('"', '\\"').replace('%', '%%')
    if executable:
        value = value.replace('$', '$$')
    return '"' + value + '"'


def systemctl(*args, check=True):
    return subprocess.run(['systemctl', '--user', *args], check=check, text=True, capture_output=True)


def units(config):
    command = f'{quote(sys.executable, True)} -m modelsheet_cli monitor'
    # WorkingDirectory takes a literal path, unlike ExecStart/Environment token syntax.
    quote(PROJECT_ROOT)  # Reject control characters before writing the unit.
    working_directory = str(PROJECT_ROOT).replace('%', '%%')
    service = f'''{MARKER}
[Unit]
Description=ModelSheet managed model monitoring
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory={working_directory}
Environment={quote('MODELSHEET_MONITOR_HOME=' + str(store.home()))}
Environment=GIT_TERMINAL_PROMPT=0
ExecStartPre={command} update --skip-dirty
ExecStart={command} run --build-db
TimeoutStartSec=30min
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
'''
    timer = f'''{MARKER}
[Unit]
Description=ModelSheet model monitoring schedule

[Timer]
OnCalendar={store.calendar(config)}
Persistent=true
AccuracySec=1min
Unit={UNIT}.service

[Install]
WantedBy=timers.target
'''
    return {UNIT + '.service': service, UNIT + '.timer': timer}


def install(config):
    rendered = units(config)
    directory = unit_dir()
    directory.mkdir(parents=True, exist_ok=True)
    for name in rendered:
        path = directory / name
        if path.exists() and not path.read_text(encoding='utf-8').startswith(MARKER):
            raise ValueError(f'Refusing to overwrite an unmanaged unit: {path}')
    for name, text in rendered.items():
        path = directory / name
        temp = path.with_suffix(path.suffix + '.tmp')
        temp.write_text(text, encoding='utf-8')
        temp.replace(path)
    systemctl('daemon-reload')


def start():
    with store.locked():
        config = store.load()
        store.validate(config)
        install(config)
    systemctl('enable', '--now', UNIT + '.timer')


def stop():
    systemctl('disable', '--now', UNIT + '.timer')
    systemctl('stop', UNIT + '.service')


def status():
    result = {}
    for suffix in ('timer', 'service'):
        try:
            response = systemctl('show', UNIT + '.' + suffix, '--no-pager',
                                 '-p', 'LoadState', '-p', 'ActiveState', '-p', 'UnitFileState',
                                 '-p', 'Result', '-p', 'NextElapseUSecRealtime', check=False)
            result[suffix] = dict(line.split('=', 1) for line in response.stdout.splitlines() if '=' in line)
            if response.returncode:
                result[suffix]['error'] = response.stderr.strip()
        except FileNotFoundError:
            result[suffix] = {'error': 'systemctl is unavailable; use monitor run with an external scheduler'}
    return result
