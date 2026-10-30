# Small, non-root Caddy build with reviewed module/toolchain versions.
FROM golang:1.27.3-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 go build -mod=readonly -trimpath -buildvcs=false -ldflags="-w -s" -o /out/caddy .
COPY collect-licenses.sh ./
RUN mkdir -p /out/data/caddy /out/config/caddy && chown -R 1000:1000 /out/data /out/config && sh collect-licenses.sh

FROM scratch
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/caddy /usr/bin/caddy
COPY --from=build --chown=1000:1000 /out/data /data
COPY --from=build --chown=1000:1000 /out/config /config
COPY --from=build /out/licenses /usr/share/licenses
ENV XDG_CONFIG_HOME=/config XDG_DATA_HOME=/data
USER 1000:1000
EXPOSE 80 443
ENTRYPOINT ["/usr/bin/caddy"]
CMD ["run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
