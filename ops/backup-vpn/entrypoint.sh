#!/bin/sh
set -eu
# Use a separate network namespace: forwarding via db:5432 retains SCRAM auth,
# unlike the primary's trusted localhost connection.
socat TCP-LISTEN:15432,bind=127.0.0.1,reuseaddr,fork TCP:db:5432 &
proxy_pid=$!
/usr/local/bin/containerboot &
vpn_pid=$!
trap 'kill "$proxy_pid" "$vpn_pid" 2>/dev/null || true' EXIT
trap 'exit 0' TERM INT
# If either process dies, restart the whole service rather than leave a dead proxy.
while kill -0 "$proxy_pid" 2>/dev/null && kill -0 "$vpn_pid" 2>/dev/null; do
  sleep 2 & wait $! || true
done
exit 1
