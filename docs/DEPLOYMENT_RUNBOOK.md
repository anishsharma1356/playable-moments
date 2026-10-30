# Single-host deployment preparation

Updated 28 October 2026. **No public deployment yet.** The current minimal app image passed nine workflow/restore checks, five private-network HTTPS checks and runtime/license checks. Application scan: **0 critical / 0 high / 17 medium / 9 low**; unchanged proxy: **1 high / 1 unknown**. Exact identities and findings are in [the current image review](evidence/minimal-image-review-2026-10-28.json), with dispositions in [DEPENDENCY_SECURITY.md](DEPENDENCY_SECURITY.md). Actual host validation, residual-risk acceptance/maintenance, public DNS/TLS, hosted OAuth, recovery and capacity remain.

## Before buying or changing hosting

### Prepared hosting choice — awaiting budget/account access

**Submission priority update:** this remains an optional public-launch plan. The rules checked on 28 October specify repository-based judging access and do not explicitly list public app hosting as a deliverable. The user asked about avoiding hosting; the recommended next work is the local submission path in SUBMISSION_CHECKLIST.md. No purchase is authorized or needed to continue that work.

Recommended initial host: DigitalOcean **Basic / Regular, 2 vCPU, 4 GiB RAM, 80 GiB SSD**, Linux x64, Bangalore (BLR1); use Singapore if that exact bundled plan is unavailable. The official [price table](https://www.digitalocean.com/pricing/droplets) checked on 28 October lists **US$24/month**, $0.03571/hour, with 4,000 GiB transfer. Tax, a domain, optional backup storage and overage are separate. [Regional availability](https://docs.digitalocean.com/platform/regional-availability/) lists Basic plans in Bangalore and Singapore; the account checkout must confirm actual availability and price. This is a suitable starting configuration to measure, not a tested public capacity claim.

Select this exact bundled plan, not an automatically substituted v5 configuration: the [provider pricing documentation](https://docs.digitalocean.com/products/droplets/details/pricing/) explains that v5 uses separate resource rates and has no monthly cap. Set a billing alert before starting. Do not add paid backup/storage/other services or purchase a domain without first showing their actual costs. A stopped server can still incur charges; verify billing and preserve data before any eventual deletion.

The user has not yet chosen a hosting budget or provider account. No purchase, account creation, DNS change or deployment has occurred. The next human input is whether to use this paid plan, use an existing host, or finish the local demo first with public deployment still pending. For a new account, the user handles sign-in, verification, payment details and provider agreements privately.

Once that choice is made, work in order:

1. Confirm the exact plan/cost and account access; obtain an existing domain/subdomain or quote a new one separately.
2. Provision one Linux x64 host, restrict SSH to the operator, expose only ports 80/443 publicly, and install Docker/Compose. Select a supported distro image; verify its current support and Docker instructions when provisioning.
3. Transfer reviewed source only, build on the host and configure secrets privately. Use empty hosted data initially; don't connect a restored copy and the local installation to Twitch at the same time.
4. Point DNS, register the precise Twitch HTTPS callback alongside localhost, then verify public TLS and real owner authorization. User completes Twitch sign-in if requested.
5. Run declared synthetic public-host load without sending load to Twitch, verify independent-browser media gates, perform stopped encrypted backup/restore and a restart rehearsal, and record measured limits and costs.

Encrypted app-aware backups are required; provider snapshots alone do not prove database/media consistency. Use the existing stop/backup/verify/restore procedure below and an off-host encrypted copy. The first host still needs its own residual-advisory/configuration review before acceptance.

Choose one Linux host, a domain/subdomain, and a budget with the owner. The initial class to measure is 2 CPUs, 4 GiB RAM and enough persistent disk for original/master/output/temp files plus a separate backup. This is not a capacity guarantee. One application replica only. Do not point two processes at the same database.

The prepared topology is Caddy on ports 80/443 → private app:3000 → named app_data volume. Both services run as UID 1000, with read-only roots, no Linux capabilities, no-new-privileges and bounded resources. The app writes /data; Caddy writes its separate certificate/config volumes. The proxy admin API is disabled. No app/database/OBS port is published. Fastify trusts exactly one proxy hop: do not add another ingress or publish port 3000 without revisiting that boundary. Caddy passes the original Host, Range and streaming responses; access logging is omitted because OAuth codes and overlay capabilities appear in URLs.

## Local container gate — must pass before public deployment

1. Start Docker Desktop with its Linux engine (or use a Linux Docker host). Do not reset/delete Docker data to resolve startup problems. Handle any OS permission prompt yourself.
2. Run `docker build -t playable-moments:local .` and `docker build -t playable-moments-proxy:local ops/proxy`. Both contexts explicitly allow only build inputs. The final app stage is `minimal-runtime`: selected Linux x64 binaries/libraries, frozen production dependencies, CA certificates and notices, without a shell or package manager. Compiled operator commands run directly with Node. Media builds from checksum-locked source plus tested upstream patches; the proxy uses its committed Go module lockfiles. Other CPU architectures have not been verified.
3. Record the Node/Caddy image digests and FFmpeg build/version; scan the built image for vulnerabilities and review third-party licenses before promotion. The base image digests are pinned; Debian security packages still resolve at build time. Record each resulting image and package inventory rather than assuming two builds have identical bytes.
4. Run `docker compose --env-file .env.production config --quiet` after completing private configuration. Do not print the rendered environment or share `docker inspect` output containing credentials.
5. Exercise health, upload, render, publication, Range/SSE, stopped backup/restore, restart during voting, and anonymous spoiler gates in a private staging environment. Verify non-root ownership and that /data survives recreation. Capture the image digest and results. The synthetic container/restore and internal HTTPS checks below passed. Hosted live-vote interruption, external reachability and fresh-host acceptance remain.

### Checks actually run locally

The current image identities and scan hashes are recorded in `evidence/minimal-image-review-2026-10-28.json`; earlier hardening evidence is historical. The app ran as UID 1000 with a read-only root, no Linux capabilities, no-new-privileges, a private writable test volume, 64 MiB temporary storage, 128-process limit, 2 CPUs and 3 GiB memory. Its test volume is unrelated to `data/twitch`.

`ops/container-smoke.mjs` generated an original synthetic recording, performed actual upload/normalization/split encoding, decoded both files, approved/published that fixture, tested safe manifests/Range/choice/reveal, restarted, and backed up/verified/restored the stopped database and media. The same saved replay succeeded after restore while an unrelated session was denied. This is automated DEMO fixture approval, not creator review of an actual broadcast.

Repeat the container workflow from PowerShell with a fresh volume each time:

```powershell
$checkName = 'pm-smoke-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$checkScript = (Resolve-Path -LiteralPath 'ops/container-smoke.mjs').Path
docker run --name $checkName --network none --read-only --tmpfs /tmp:size=64m --cap-drop ALL --security-opt no-new-privileges --pids-limit 128 --memory 3g --cpus 2 -e PM_CONTAINER_TEST=synthetic-only --mount "type=volume,source=$checkName,target=/data" --mount "type=bind,source=$checkScript,target=/app/container-smoke.mjs,readonly" playable-moments:local node container-smoke.mjs
docker cp "${checkName}:/data/container-smoke.json" "data/${checkName}-results.json"
```

Check the run exits successfully and reports all nine PASS lines before copying/using its evidence. The stopped container and synthetic volume are deliberately retained. Never substitute a real-data volume into this fixture command. Production dependencies are installed using [pnpm's production-only install option](https://pnpm.io/cli/install), with the unchanged frozen lockfile.

For the current runtime boundary check, mount `ops/runtime/check.mjs` at `/app/check-runtime.mjs` and invoke `node check-runtime.mjs` with the same read-only/capability restrictions. It verifies file hashes, loaded libraries, UID, absent tools/modules and retained license texts. Set `PM_PUBLIC_NETWORK_CHECK=1` only when an outbound, credential-free Twitch TLS check is wanted; a 401 response is not owner authorization. The older `ops/runtime-security-check.mjs` used tools present in the earlier Debian runtime and is historical, not a command for this shell-free image. Inspect a disposable build stage for diagnostics; do not install tools into production.

For the proxy check, the stopped synthetic restore was given an expiring overlay capability by `ops/proxy-fixture.mjs`. This helper rejects databases with non-DEMO sessions, uses only `/data/restored` and writes a private `/data/proxy-fixture.json` without printing the token. It is a test utility, not an owner-authentication bypass for production data.

The app then ran in hosted mode with fake Twitch credentials on an **internal Docker network**, alias `app`, using that restored volume. Caddy used the actual `ops/Caddyfile` with test-only `local_certs` and `skip_install_trust` global options. Its public test CA certificate was passed directly to `ops/proxy-smoke.mjs`; no private CA key was exported and no certificate was installed into Windows. The client set `PM_PROXY_HOST` to the proxy container, `PM_HTTP_PORT=80`, `PM_HTTPS_PORT=443`, with SNI/Host `moments.test`. No TLS validation was disabled. Five checks verify redirect, certificate/hostname, compiled Studio, secure cookies, owner/health restrictions, safe manifests, exact Range bytes, Origin/session gates and unbuffered safe overlay SSE.

The client reads only the test CA and fixture capability under `data/container-verification` inside the client container. Mount matching fixture files there and select the corresponding container report with `PM_RELEASE_EVIDENCE`; `PM_EVIDENCE_PATH` selects output. The latest run used `evidence/minimal-final-container-2026-10-28.json`, with metadata under ignored `data/security-finish/final-runtime.json` and fake configuration under `data/dependency-hardening/hosted.env`. All inputs must match the same synthetic volume; fixture tokens expire after an hour. Start neither this restore nor any restored real database with real Twitch credentials alongside the original installation.

The initial Windows-loopback attempt returned connection refused because the internal Docker network did not publish host ports. The passing client ran within the private network. Thus these results establish application/proxy behavior under TLS, **not public or Windows-host reachability**. All temporary test app/proxy services were stopped afterward.

### Security and license findings — promotion remains pending

Scanned exported app/proxy archives using Trivy 0.76.1, with a separately downloaded vulnerability database. Scans ran without network access or a Docker-socket mount; no image or user recordings were uploaded. Current identities, report hashes and counts are in `evidence/minimal-image-review-2026-10-28.json`; the latest app report is under ignored `data/security-finish/minimal-final-app-scan.json`. Earlier reports remain as historical baselines.

| Image | Baseline → hardened result |
|---|---|
| App | 967 → 163 → 26 package/advisory occurrences; critical 7 → 0; high 264 → 43 → 0. Current report has 24 distinct advisory IDs. Seven OS package provenance records cover the selected libraries/certificates. |
| Proxy | Critical remains 0; high 10 → 1. Go JOSE v3 remains flagged with no patched v3 version reported; the available x/net fixes were also applied. |

Counts are scanner findings, **not confirmed exploitable vulnerabilities**. One advisory can repeat across multiple packages. No suppression was added. The custom FFmpeg binary is outside OS-package scanning: its source was separately checked against OSV, two relevant advisories received tested upstream fixes, and three concern compiled-out network formats. See [the assessment](DEPENDENCY_SECURITY.md) for patch provenance, runtime checks, remaining lower/unknown findings and explicit limitations.

Review the scoped residual findings against the actual deployment before public promotion. Re-run scans, the nine container checks and the five TLS checks after replacement builds. Media patch regressions run during the build. Assign maintenance responsibility for source backports and locked Go dependencies; prefer supported upstream fixes when available. Existing root-owned Caddy volumes need a backed-up, deliberate ownership migration; do not silently reuse or delete them. The rehearsal used fresh UID-1000 volumes.

License metadata is an inventory only. Full notices and the previously missing abstract-logging notice are now retained. Initial submission is prepared as source plus build instructions; FFmpeg/libx264 corresponding-source materials remain a separate gate before sharing any prebuilt image. No image has been pushed. The scan is not a vulnerability-free or license-compliance certification.

## Private host configuration

Copy `ops/production.env.example` to `.env.production` on the host; restrict it to the operator (`chmod 600`). Set PUBLIC_HOST to the chosen hostname, app credentials and allowlisted broadcaster ID privately. Generate three separate 32-byte random keys and base64-encode each; never put values in chat, source control, VITE variables or screenshots.

For a new empty host, use new keys. For a deliberate data migration/restore, preserve the original three keys securely or encrypted token/vote verification will no longer work. Keep the secret backup separately from the data backup. Changing the token encryption key requires reconnecting Twitch; signing/vote keys must not be casually rotated on existing data. Do not silently create replacement keys during restore.

Register the exact `https://YOUR_HOST/auth/twitch/callback` URL in Twitch's app settings, retaining the localhost callback while local development is needed. Point DNS to the host. Open only HTTPS/HTTP and the operator's necessary SSH access; 3000 remains private. After these choices are approved and configured:

```sh
docker compose --env-file .env.production build app proxy
docker compose --env-file .env.production up -d app
docker compose --env-file .env.production exec app node dist/ops/manage.js doctor
docker compose --env-file .env.production up -d proxy
```

HTTPS issuance requires a reachable hostname and Caddy's persistent certificate volume. Validate the certificate, HTTP→HTTPS redirect and public health-path denial. Connect Twitch as the allowlisted owner. Verify secure HttpOnly SameSite cookies, no demo login, expected Origin/Host rejection, owner-only recordings and reveal/result denial from a fresh browser. Doctor checks tools/config/storage, not Twitch READY or external TLS. Rehearse with a new round; do not reopen old snapshots.

## Consistent backup and restore

Backups contain private recordings, sessions and encrypted OAuth data: encrypt them at rest, restrict access and keep a copy off the application disk. Hashes detect corruption; they do not authenticate an attacker-controlled backup. Do not upload a data backup to the public repository.

Stop the app before backup. Do not backup during open voting or rendering. The backup command uses SQLite's backup API (includes committed WAL), copies all READY media referenced by that snapshot, verifies SHA-256 against the database and runs SQLite integrity/foreign-key checks. Unreferenced files and unfinished uploads are excluded. Only a backup with a completed manifest and successful verify is usable. No secret environment file is included. A failed attempt may leave an incomplete directory; choose a fresh destination on retry.

Host example (from the project directory; paths are operator-owned):

```sh
mkdir -p backups
sudo chown 1000:1000 backups
chmod 700 backups
docker compose --env-file .env.production stop app
docker compose --env-file .env.production run --rm --no-deps -v "$(pwd)/backups:/backups" app node dist/ops/backup.js backup /data /backups/RELEASE-DATE --app-stopped
docker compose --env-file .env.production run --rm --no-deps -v "$(pwd)/backups:/backups:ro" app node dist/ops/backup.js verify /backups/RELEASE-DATE
docker compose --env-file .env.production up -d app
```

`--app-stopped` is an operator assertion, not an automatic process detector. Verify the stop succeeded. Keep the proxy stopped too for initial migrations/recovery if visitors should not reach the maintenance service.

Restore into a **new, nonexistent** directory; it refuses overwriting existing data. Example on an isolated recovery host, with the same image and separately recovered keys available:

```sh
mkdir -p recovery
sudo chown 1000:1000 recovery
docker run --rm -v "$(pwd)/backups:/backups:ro" -v "$(pwd)/recovery:/recovery" playable-moments:local node dist/ops/backup.js restore /backups/RELEASE-DATE /recovery/data --app-stopped
```

Do not connect a restored copy to Twitch while the original installation is running. Start the recovery app with the restored directory mounted at /data, one replica and the original secret configuration. Verify doctor, published content/media hashes, anonymous access gates and creator sign-in before switching traffic. Keep the previous data volume intact until recovery is accepted. Reverse traffic to the previous image/data pair on failure; do not roll back migrations by guessing or overwrite the only backup. An interrupted OPEN round must remain INTERRUPTED after restart.

Local Windows fixture/operator equivalents: `node node_modules/tsx/dist/cli.mjs ops/backup.ts backup SOURCE NEW_BACKUP --app-stopped`, `verify BACKUP`, and `restore BACKUP NEW_DATA --app-stopped`. Never run restore over data/twitch.

## Remaining deployment acceptance

- Review residual dependency assessments, lower/unknown findings and license obligations; refresh scans before promotion. Hardened Linux build, media regressions, codec/render/restore and internal Caddy TLS/Range/SSE checks have passed.
- Fresh-host install; real domain/TLS, OAuth callback and owner/session isolation checks.
- Restore a published release and replay it on the staging host with original keys.
- Observe restart, disk reserve, job failure and SSE behavior behind the proxy.
- Measure the specified synthetic vote-load and a declared modest video-client load; do not send load traffic to Twitch or describe fixture accounts as people.
- Record hosting, disk/backup retention, certificate renewal, operating cost and maintenance ownership. No public launch until these gates have evidence.

Proxy references: [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) and [request body limits](https://caddyserver.com/docs/caddyfile/directives/request_body). SSE uses Caddy's documented event-stream flushing; no response buffering was enabled.

Current evidence: [image review](evidence/minimal-image-review-2026-10-28.json), [container workflow](evidence/minimal-final-container-2026-10-28.json), [HTTPS proxy](evidence/minimal-final-proxy-2026-10-28.json), and [runtime checks](evidence/minimal-final-runtime-check-2026-10-28.json). Tested tags are `playable-moments:local` and `playable-moments-proxy:local`. The previous app image is retained as `playable-moments:pre-minimal-20261028`. All temporary services were stopped; nothing was pushed or publicly deployed.
