"""Bounded, disk-backed PostgreSQL snapshots; no third-party Python dependencies."""
import contextlib
import datetime
import fcntl
import json
import os
from pathlib import Path
import select
import signal
import socket
import socketserver
import struct
import subprocess
import sys
import threading
import time

ROOT = Path('/backups')
INTERVAL = 72 * 3600
RETRY = 3600
KEEP = 2
STOP = threading.Event()
CHILD = None


def run(args, **kwargs):
    global CHILD
    CHILD = subprocess.Popen(args, **kwargs)
    try:
        code = CHILD.wait()
        if code:
            raise RuntimeError(f'{args[0]} exited with code {code}')
    finally:
        CHILD = None


def stop(_signum, _frame):
    STOP.set()
    if CHILD is not None:
        CHILD.terminate()


@contextlib.contextmanager
def locked(shared=False):
    # Kernel releases this lock even after SIGKILL. No stale PID directories.
    mode = 'rb' if shared else 'a+b'
    with (ROOT / '.lock').open(mode) as lock:
        fcntl.flock(lock, (fcntl.LOCK_SH if shared else fcntl.LOCK_EX) | fcntl.LOCK_NB)
        yield


def dumps():
    return sorted(ROOT.glob('bdokeep-*.dump'), reverse=True)


def due(now=None):
    files = dumps()
    return not files or (time.time() if now is None else now) >= files[0].stat().st_mtime + INTERVAL


def state(**values):
    temporary = ROOT / 'status.json.partial'
    temporary.write_text(json.dumps(values, ensure_ascii=False) + '\n')
    temporary.replace(ROOT / 'status.json')


def publish_latest():
    files = dumps()
    link = ROOT / 'latest.partial'
    link.unlink(missing_ok=True)
    if files:
        link.symlink_to(files[0].name)
        link.replace(ROOT / 'latest.dump')
    for old in files[KEEP:]:
        old.unlink()


def snapshot():
    ROOT.mkdir(parents=True, exist_ok=True)
    with locked():
        for partial in ROOT.glob('*.partial'):
            partial.unlink()
        publish_latest()
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        target = ROOT / f'bdokeep-{stamp}.dump'
        partial = target.with_suffix('.partial')
        env = {**os.environ, 'PGHOST': '127.0.0.1', 'PGPORT': '15432',
               'PGUSER': 'bdokeep_backup', 'PGDATABASE': 'bdokeep', 'PGCONNECT_TIMEOUT': '15'}
        try:
            run(['pg_dump', '--format=custom', '--no-owner', '--no-acl',
                 '--lock-wait-timeout=30s', '--file', str(partial)], env=env)
            if STOP.is_set():
                raise RuntimeError('backup interrupted')
            run(['pg_restore', '--list', str(partial)], stdout=subprocess.DEVNULL)
            with partial.open('rb') as handle:
                os.fsync(handle.fileno())
            os.utime(partial, None)  # Schedule from completion, not start.
            partial.replace(target)
            publish_latest()
            state(result='success', completed_at=time.time(), file=target.name,
                  bytes=target.stat().st_size, validation='archive-list')
            print(f'backup: success {target.name} ({target.stat().st_size} bytes)', flush=True)
        except BaseException as error:
            partial.unlink(missing_ok=True)
            state(result='error', attempted_at=time.time(), error=str(error))
            raise


def recv_exact(sock, count):
    data = bytearray()
    while len(data) < count:
        chunk = sock.recv(count - len(data))
        if not chunk:
            raise ConnectionError('SOCKS proxy closed connection')
        data.extend(chunk)
    return bytes(data)


class Proxy(socketserver.BaseRequestHandler):
    def handle(self):
        try:
            with socket.create_connection(('127.0.0.1', 1055), timeout=15) as remote:
                remote.sendall(b'\x05\x01\x00')
                if recv_exact(remote, 2) != b'\x05\x00':
                    raise ConnectionError('SOCKS authentication failed')
                host = os.environ['BACKUP_DB_HOST'].encode('idna')
                remote.sendall(b'\x05\x01\x00\x03' + bytes([len(host)]) + host + struct.pack('!H', 5432))
                version, reply, reserved, kind = recv_exact(remote, 4)
                if version != 5 or reply != 0 or reserved != 0:
                    raise ConnectionError('SOCKS connection to production failed')
                if kind == 1:
                    recv_exact(remote, 4)
                elif kind == 4:
                    recv_exact(remote, 16)
                elif kind == 3:
                    recv_exact(remote, recv_exact(remote, 1)[0])
                else:
                    raise ConnectionError('invalid SOCKS response')
                recv_exact(remote, 2)
                remote.settimeout(None)
                peers = [self.request, remote]
                while peers:
                    ready, _, _ = select.select(peers, [], [], 1)
                    if STOP.is_set():
                        return
                    for source in ready:
                        destination = remote if source is self.request else self.request
                        data = source.recv(65536)
                        if data:
                            destination.sendall(data)
                        else:
                            peers.remove(source)
                            destination.shutdown(socket.SHUT_WR)
        except (OSError, ValueError, KeyError) as error:
            print(f'proxy: {error}', file=sys.stderr, flush=True)


class ProxyServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def daemon():
    ROOT.mkdir(parents=True, exist_ok=True)
    # Cleanup and rotation after an interrupted publish, under the same lock.
    with locked():
        for partial in ROOT.glob('*.partial'):
            partial.unlink()
        publish_latest()
    with ProxyServer(('127.0.0.1', 15432), Proxy) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        retry_at = 0
        try:
            while not STOP.is_set():
                if due() and time.time() >= retry_at:
                    try:
                        snapshot()
                        retry_at = 0
                    except BlockingIOError:
                        # Manual dump / restore check in progress; check again shortly.
                        pass
                    except Exception as error:
                        print(f'backup: {error}; retry in one hour', file=sys.stderr, flush=True)
                        retry_at = time.time() + RETRY
                STOP.wait(30)
        finally:
            server.shutdown()


def status():
    files = dumps()
    value = json.loads((ROOT / 'status.json').read_text()) if (ROOT / 'status.json').exists() else {}
    value['dumps'] = [{'file': f.name, 'bytes': f.stat().st_size} for f in files]
    value['next_due_utc'] = (datetime.datetime.fromtimestamp(files[0].stat().st_mtime + INTERVAL,
                           datetime.timezone.utc).isoformat() if files else 'now')
    print(json.dumps(value, ensure_ascii=False, indent=2))


def verify():
    # Isolated postgres container, anonymous PGDATA volume; never connects to prod.
    with locked(shared=True):
        files = dumps()
        if not files:
            raise RuntimeError('no dump to verify')
        env = {**os.environ, 'PGHOST': '/var/run/postgresql', 'PGUSER': 'postgres',
               'PGDATABASE': 'restore_check'}
        database = subprocess.Popen(['docker-entrypoint.sh', 'postgres', '-c', 'listen_addresses='], env=env)
        try:
            for _ in range(120):
                if database.poll() is not None:
                    raise RuntimeError('temporary PostgreSQL failed to start')
                # Entrypoint briefly starts an initialization server. Wait for
                # the final exec'ed postmaster, not that temporary server.
                pid_file = Path(os.environ.get('PGDATA', '/var/lib/postgresql/data')) / 'postmaster.pid'
                final_server = pid_file.exists() and pid_file.read_text().splitlines()[0] == str(database.pid)
                if final_server and subprocess.call(['pg_isready', '-q', '-U', 'postgres', '-d', 'restore_check'], env=env) == 0:
                    break
                time.sleep(1)
            else:
                raise RuntimeError('temporary PostgreSQL startup timeout')
            run(['psql', '-v', 'ON_ERROR_STOP=1', '-c',
                 'CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE bdokeep_app NOLOGIN;'], env=env)
            run(['pg_restore', '--exit-on-error', '--no-owner', '--no-acl',
                 '--dbname=restore_check', str(files[0])], env=env)
            run(['psql', '-v', 'ON_ERROR_STOP=1', '-c',
                 'SELECT count(*) FROM public.classes; SELECT count(*) FROM drizzle.__drizzle_migrations;'], env=env)
            print(f'verify: restored {files[0].name} successfully')
        finally:
            database.terminate()
            try:
                database.wait(timeout=30)
            except subprocess.TimeoutExpired:
                database.kill()
                database.wait()


if __name__ == '__main__':
    os.umask(0o077)
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    commands = {'daemon': daemon, 'once': snapshot, 'status': status, 'verify': verify}
    try:
        commands[sys.argv[1] if len(sys.argv) > 1 else 'daemon']()
    except Exception as error:
        print(f'backup: {error}', file=sys.stderr)
        sys.exit(1)
