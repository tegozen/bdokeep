"""Real pg_dump against the isolated fixture from test.compose.yml."""
import os
import subprocess
import time
from unittest.mock import patch
import backup as b

for _ in range(3):
    b.snapshot()
assert len(b.dumps()) == 2
originals = b.dumps()
assert not b.due()
assert b.due(originals[0].stat().st_mtime + b.INTERVAL)

with patch.dict(os.environ, {'PGPASSWORD': 'incorrect'}):
    try:
        b.snapshot()
        raise AssertionError('incorrect password unexpectedly succeeded')
    except RuntimeError:
        pass
assert b.dumps() == originals
assert not list(b.ROOT.glob('*.partial'))

real_run = b.run
def offline(args, **kwargs):
    if args[0] == 'pg_dump':
        kwargs['env']['PGPORT'] = '15433'
    real_run(args, **kwargs)
with patch.object(b, 'run', offline):
    try:
        b.snapshot()
        raise AssertionError('offline database unexpectedly succeeded')
    except RuntimeError:
        pass
assert b.dumps() == originals

# Interrupt an actual pg_dump while it is waiting for a table lock.
admin = {**os.environ, 'PGUSER': 'postgres', 'PGPASSWORD': 'test',
         'PGHOST': '127.0.0.1', 'PGPORT': '15432', 'PGDATABASE': 'bdokeep'}
locker = subprocess.Popen(['psql', '-v', 'ON_ERROR_STOP=1', '-c',
    'BEGIN; LOCK TABLE public.classes IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(20);'],
    env=admin, stdout=subprocess.DEVNULL)
try:
    time.sleep(1)
    child = subprocess.Popen(['python3', '/app/backup.py', 'once'])
    time.sleep(1)
    child.terminate()
    assert child.wait(timeout=10) != 0
finally:
    locker.terminate()
    locker.wait(timeout=10)
assert b.dumps() == originals
assert not list(b.ROOT.glob('*.partial'))
b.status()
print('snapshots: actual dump, two-file rotation, wrong password, offline, SIGTERM passed')
