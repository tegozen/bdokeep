FROM tailscale/tailscale:stable@sha256:c507f3a2a6ab1cabd8d809b98edeb41edbd5c3fb6ad9632ffd098b4c7d0b4065
RUN apk add --no-cache socat
COPY entrypoint.sh /vpn-entrypoint.sh
COPY serve.json /config/serve.json
ENTRYPOINT ["sh", "/vpn-entrypoint.sh"]
