import errno
import importlib.util
import os
from pathlib import Path
import socket
import socketserver
import struct
import tempfile
import threading
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('backup', Path(__file__).with_name('backup.py'))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = patch.object(b, 'ROOT', Path(self.tmp.name))
        self.root.start()
        b.STOP.clear()

    def tearDown(self):
        self.root.stop()
        self.tmp.cleanup()

    def good_run(self, args, **kwargs):
        if args[0] == 'pg_dump':
            Path(args[-1]).write_bytes(b'archive')

    def test_rotation_and_schedule(self):
        with patch.object(b, 'run', self.good_run):
            for _ in range(4):
                b.snapshot()
        self.assertEqual(len(b.dumps()), 2)
        self.assertTrue((b.ROOT / 'latest.dump').is_symlink())
        self.assertEqual((b.ROOT / 'latest.dump').resolve(), b.dumps()[0].resolve())
        self.assertFalse(b.due())
        self.assertTrue(b.due(b.dumps()[0].stat().st_mtime + b.INTERVAL))

    def test_failed_dump_preserves_two_copies_and_cleans_partial(self):
        with patch.object(b, 'run', self.good_run):
            b.snapshot()
            b.snapshot()
        originals = b.dumps()
        for error in [RuntimeError('connection refused'), RuntimeError('wrong password'),
                      OSError(errno.ENOSPC, 'disk full'), RuntimeError('interrupted')]:
            def fail(args, **kwargs):
                Path(args[-1]).write_bytes(b'incomplete')
                raise error
            with patch.object(b, 'run', fail), self.assertRaises(type(error)):
                b.snapshot()
            self.assertEqual(b.dumps(), originals)
            self.assertEqual(list(b.ROOT.glob('*.partial')), [])

    def test_archive_validation_failure_is_not_published(self):
        def fail_list(args, **kwargs):
            self.good_run(args, **kwargs)
            if args[0] == 'pg_restore':
                raise RuntimeError('bad archive')
        with patch.object(b, 'run', fail_list), self.assertRaises(RuntimeError):
            b.snapshot()
        self.assertEqual(b.dumps(), [])

    def test_stale_partial_and_kernel_lock(self):
        (b.ROOT / 'old.partial').write_bytes(b'incomplete')
        with b.locked(), self.assertRaises(BlockingIOError):
            b.snapshot()
        with patch.object(b, 'run', self.good_run):
            b.snapshot()
        self.assertFalse((b.ROOT / 'old.partial').exists())
        with b.locked(shared=True), self.assertRaises(BlockingIOError):
            b.snapshot()

    def test_termination_does_not_publish(self):
        def interrupted(args, **kwargs):
            self.good_run(args, **kwargs)
            b.STOP.set()
        with patch.object(b, 'run', interrupted), self.assertRaises(RuntimeError):
            b.snapshot()
        self.assertEqual(b.dumps(), [])

    def test_socks_proxy_streams_and_preserves_half_close(self):
        class Socks(socketserver.BaseRequestHandler):
            def handle(self):
                self.server.greeting = b.recv_exact(self.request, 3)
                # Deliberately fragmented SOCKS response.
                self.request.sendall(b'\x05')
                self.request.sendall(b'\x00')
                header = b.recv_exact(self.request, 5)
                self.server.target = b.recv_exact(self.request, header[4]).decode()
                self.server.port = struct.unpack('!H', b.recv_exact(self.request, 2))[0]
                self.request.sendall(b'\x05\x00\x00\x01\x7f\x00\x00\x01\x15\x38')
                payload = bytearray()
                while data := self.request.recv(65536):
                    payload.extend(data)
                self.request.sendall(payload)
        with socketserver.TCPServer(('127.0.0.1', 1055), Socks) as socks, \
                b.ProxyServer(('127.0.0.1', 0), b.Proxy) as proxy, \
                patch.dict(os.environ, {'BACKUP_DB_HOST': '100.64.0.1'}):
            threading.Thread(target=socks.serve_forever, daemon=True).start()
            threading.Thread(target=proxy.serve_forever, daemon=True).start()
            try:
                payload = b'x' * 200000
                with socket.create_connection(proxy.server_address, timeout=5) as client:
                    client.sendall(payload)
                    client.shutdown(socket.SHUT_WR)
                    self.assertEqual(b.recv_exact(client, len(payload)), payload)
                self.assertEqual(socks.greeting, b'\x05\x01\x00')
                self.assertEqual((socks.target, socks.port), ('100.64.0.1', 5432))
            finally:
                proxy.shutdown()
                socks.shutdown()


if __name__ == '__main__':
    unittest.main()
