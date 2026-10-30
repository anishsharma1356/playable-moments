#!/bin/sh
set -eu
(cd /patches && sha256sum -c SHA256SUMS)
mkdir -p /opt/ffmpeg/share/security
cc -I. /patches/security-regressions.c libavutil/libavutil.a -lm -pthread -o /tmp/media-regressions
ulimit -c 0
set +e
timeout 15 /tmp/media-regressions hdr > /opt/ffmpeg/share/security/before.txt 2>&1
hdr_status=$?
timeout 15 /tmp/media-regressions pssh >> /opt/ffmpeg/share/security/before.txt 2>&1
pssh_status=$?
set -e
test "$hdr_status" -eq 134
test "$pssh_status" -eq 139
printf 'Reproduced unpatched failures: HDR exit %s; stack exit %s\n' "$hdr_status" "$pssh_status"
for fix in hdr-metadata pssh-free pssh-append-backport pssh-mov; do
    patch --batch --forward --fuzz=0 -p1 < "/patches/$fix.patch"
done
make -j4
make install
cc -I. /patches/security-regressions.c libavutil/libavutil.a -lm -pthread -o /tmp/media-regressions
timeout 15 /tmp/media-regressions hdr > /opt/ffmpeg/share/security/after.txt
timeout 15 /tmp/media-regressions pssh >> /opt/ffmpeg/share/security/after.txt
make libavutil/tests/encryption_info
timeout 15 ./libavutil/tests/encryption_info
printf 'PASS: upstream encryption metadata tests, including append equivalence\n' >> /opt/ffmpeg/share/security/after.txt
cat /opt/ffmpeg/share/security/after.txt
cp -R /patches /opt/ffmpeg/share/security/patches
