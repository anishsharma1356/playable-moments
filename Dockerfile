# Tested 2026-10-28. Refresh deliberately and rerun container/security checks.
FROM node:24-trixie-slim@sha256:89c5244bc22a9bc3287d89ebc7e49b9cb5bb84cd40e6175ac3421d5a9f68b95a AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm exec esbuild ops/backup.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/ops/backup.js && pnpm exec esbuild ops/manage.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/ops/manage.js

FROM build AS production-deps
# Keep the frozen dependency graph; development tools are not runtime inputs.
# A production install over an existing tree can retain unused dev packages in
# pnpm's virtual store. Recreate the tree from the already populated offline cache.
RUN rm -rf /app/node_modules /app/apps/web/node_modules /app/apps/server/node_modules /app/packages/core/node_modules /app/packages/contracts/node_modules && CI=true pnpm install --prod --frozen-lockfile --offline

FROM node:24-trixie-slim@sha256:89c5244bc22a9bc3287d89ebc7e49b9cb5bb84cd40e6175ac3421d5a9f68b95a AS media-build
WORKDIR /media-build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev make pkg-config nasm curl ca-certificates libx264-dev libdav1d-dev && rm -rf /var/lib/apt/lists/*
# Official upstream source, checksum locked. Only local MP4 input is accepted by the app.
RUN curl --fail --location --retry 3 https://codeload.github.com/FFmpeg/FFmpeg/tar.gz/refs/tags/n9.0.2 --output source.tar.gz && echo "6e374ed621e48faa40639307dff48ba6fe574a509977956d2cce9669b7cc27e9  source.tar.gz" | sha256sum -c - && tar -xzf source.tar.gz --strip-components=1
RUN ./configure --prefix=/opt/ffmpeg --disable-autodetect --enable-gpl --enable-libx264 --enable-libdav1d --disable-doc --disable-debug --disable-ffplay --disable-network --disable-protocols --enable-protocol=file,pipe --disable-demuxers --enable-demuxer=mov --disable-muxers --enable-muxer=mp4,mov,wav,null,framemd5,framehash,rawvideo --disable-indevs --enable-indev=lavfi --disable-outdevs && make -j4 && make install && mkdir -p /opt/ffmpeg/share/licenses && cp COPYING* LICENSE.md /opt/ffmpeg/share/licenses/ && cp ffbuild/config.mak /opt/ffmpeg/share/build-config.mak

FROM media-build AS media-patched
RUN apt-get update && apt-get install -y --no-install-recommends patch && rm -rf /var/lib/apt/lists/*
COPY ops/media /patches
RUN sh /patches/apply-and-test.sh

FROM node:24-trixie-slim@sha256:89c5244bc22a9bc3287d89ebc7e49b9cb5bb84cd40e6175ac3421d5a9f68b95a AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libx264-164 libdav1d7 && rm -rf /var/lib/apt/lists/* && mkdir /data && chown node:node /data
COPY --from=media-patched /opt/ffmpeg/bin/ffmpeg /opt/ffmpeg/bin/ffprobe /usr/local/bin/
COPY --from=media-patched /opt/ffmpeg/share /usr/share/playable-moments/ffmpeg
# Runtime starts compiled JavaScript directly; package managers add unused code.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/apps/server/migrations ./apps/server/migrations
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build /app/LICENSE ./LICENSE
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data FFMPEG_PATH=ffmpeg FFPROBE_PATH=ffprobe
USER node
EXPOSE 3000
CMD ["node", "dist/server/main.js"]

# Assembly uses tools in the builder; the final image contains no shell, Perl,
# package manager or unused privileged utilities. Package provenance is retained.
FROM runtime AS runtime-files
USER root
COPY ops/runtime/assemble.mjs /assemble.mjs
COPY docs/licenses/abstract-logging-MIT.txt /extra-notices/abstract-logging-MIT.txt
RUN node /assemble.mjs

FROM scratch AS minimal-runtime
COPY --from=runtime-files /minimal-root/ /
WORKDIR /app
ENV PATH=/usr/local/bin NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data FFMPEG_PATH=ffmpeg FFPROBE_PATH=ffprobe
USER 1000:1000
EXPOSE 3000
CMD ["node", "dist/server/main.js"]
