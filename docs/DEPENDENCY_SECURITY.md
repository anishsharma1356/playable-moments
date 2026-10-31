# Deployment dependency assessment — 28 October 2026

**31 October 2026 source security follow-up:** scoped pnpm overrides upgrade the @fastify/static dependency chain to glob 14.0.2 and minimatch 11.0.1, fixing GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249. The repeat production JavaScript audit reports zero findings across 86 packages; no advisory suppression was added. All 63 unit/integration tests, build/TypeScript, lint and all six desktop/emulated-phone browser scenarios passed. Two new tests cover static serving in wildcard and enumerated-route modes, HEAD, ranges and root traversal denial. See [security evidence](evidence/security-followup-2026-10-31.json) and [browser results](evidence/browser-regression-2026-10-31.json).

The updated notices cover the installed Windows production JavaScript graph. Docker rebuild/rescan is deferred after the Linux engine failed to start; existing images do not contain this fix. The Go JOSE v3 advisory remains open. All image findings below are the dated 28 October baseline, not a fresh clean scan. The release remains source-only; prebuilt binary distribution and public hosting are deferred.

**Review follow-up, 30 October 2026:** the source-package distribution boundary and retained notices were rechecked without changing application/dependency code. The upstream [Go JOSE advisory](https://github.com/go-jose/go-jose/security/advisories/GHSA-mgcc-cww5-fp2q) still lists no patched v3 version; the locked proxy uses v3.0.5 and v4.1.6. The committed Caddyfile still disables its admin API and exposes the reverse proxy, without a public JWK-processing route. The high finding remains tracked; this configuration review is not a fresh scan, exhaustive reachability proof or public-launch approval. All scan totals below remain the dated 28 October baseline. The source notice review added the LGPL text for included FFmpeg-derived patches; binary/image redistribution remains a separate unfinished requirement.

**Current minimal runtime:** the application now copies only Node, the patched media tools, their required shared libraries, production application files, CA certificates and notices into a scratch image. Shells, Perl, package managers and unused privileged utilities are absent. Seven OS package provenance records remain, with exact versions and hashes; scanner metadata was not removed to conceal dependencies. This is a selected runtime, not an apt-managed installation: update it by rebuilding. The production tree still contains 85 JavaScript packages.

The latest offline scan reports **0 critical, 0 high, 17 medium and 9 low application findings**, with zero npm findings. There are 26 package/advisory occurrences and 24 distinct advisory IDs. The unchanged proxy has **1 high and 1 unknown**. Exact identities, hashes, all findings and checks are in [the minimal image review](evidence/minimal-image-review-2026-10-28.json). No suppression was added. Node is 24.22.1, the [21 October security release](https://nodejs.org/en/blog/release/v24.22.1). Node and custom FFmpeg require upstream/source review beyond the OS/npm package scan.

This closes the unused-package reduction and notice-collection work, not all security risk. The remaining runtime-library and proxy findings below stay tracked; actual host configuration and maintenance ownership still need validation before public launch. The previous 43-high application report is retained as historical evidence in [the earlier review](evidence/final-image-review-2026-10-28.json).

## Current residual disposition

| Group | Finding / treatment and remaining limit |
|---|---|
| Absent converters and daemon | CVE-2026-77117 / 80489 concern specific glibc conversion modules; the gconv directory is absent. CVE-2026-89092 concerns nscd; that daemon is absent. These are scoped prerequisite checks, not patched-package claims. [Debian converter advisory](https://security-tracker.debian.org/tracker/CVE-2026-77117). |
| DNS printing routines | CVE-2026-5435 / 6238 concern deprecated DNS debugging functions. Debian explicitly separates them from the ordinary resolver path. The app has no DNS-debugging feature; this does not exhaustively prove every native dependency's call paths. Keep both findings visible. [5435](https://security-tracker.debian.org/tracker/CVE-2026-5435), [6238](https://security-tracker.debian.org/tracker/CVE-2026-6238). |
| Resolver configuration | CVE-2026-8674 can abort a resolver when an unusually long search domain enters resolv.conf or LOCALDOMAIN. Validate the actual host/Docker resolver configuration and control who can change it. A successful TLS request only confirms the tested configuration works. [Debian advisory](https://security-tracker.debian.org/tracker/CVE-2026-8674). |
| Dynamic loader/local privilege | CVE-2026-86805 / 95818 remain in libc. Fixed executables, UID 1000, no capabilities, no-new-privileges, a read-only root and no user-executable upload route constrain local privilege scenarios. They do not repair the library or protect a compromised host. [95818 prerequisites](https://security-tracker.debian.org/tracker/CVE-2026-95818). |
| Other libc and C++ runtime | fopen, strfmon, tdelete, word/tilde/glob expansion, regex, thread/stack/address handling, strncasecmp and C++ allocation/container findings remain in the exact advisory list. No public shell/executable route is offered, but transitive native calls were not exhaustively audited. Upload bounds, worker timeouts and container resource limits reduce impact; they do not prove unreachability. Retain findings and take supported distro fixes when available. |
| x264 memory management | CVE-2025-25467 remains LOW. x264 is required for H.264 encoding. Encoding is one bounded child process at a time with a deadline; that is containment, not a patch. |
| Proxy | Go JOSE v3's RSA-JWK parser finding and the x/crypto OpenPGP warning remain. The deployed module/config review below finds no public service exposing these parsers. Reassess if routes, modules, PKI/admin access or configuration change. No patched v3 release is listed in the upstream advisory checked on 28 October. |

The image retains libc/C++ libraries rather than applying an unreviewed libc upgrade or private cryptographic fork. No fixed Trixie versions are listed for the remaining application entries in this scan. A future rebuild may resolve different package versions: capture new identities, rescan and repeat workflow/recovery/HTTPS checks. The old Windows Node/FFmpeg installation is outside this Linux assessment and must not be described as patched by it.

The Linux deployment images have been hardened and tested locally. **Public promotion remains pending review of the residual findings, distribution requirements and hosted acceptance.** No scanner exclusions were added. This assessment applies to the recorded images and repository Compose/Caddy configuration, not arbitrary containers or the separate Windows FFmpeg installation.

## Earlier hardening changes and evidence (superseded package counts)

- App: digest-pinned Node 24/Trixie; 83 runtime OS packages instead of 290. Production JavaScript dependencies only, with package managers and build tools excluded.
- Media: official FFmpeg n9.0.2 source, SHA-256 verified, plus four reviewed upstream security backports. Network access is compiled out; only file/pipe protocols, MOV/MP4 demuxing and the synthetic lavfi input are enabled. H.264/AAC output and dav1d decoding remain available. Restricting formats does not make arbitrary MP4 input safe.
- Proxy: Caddy 2.11.7 built with Go 1.27.3 and locked modules, including Go JOSE v4.1.6 and x/net v0.62.0. Only needed official modules are imported. The final image is static, without a shell or package manager; UID 1000, read-only root, no capabilities, no-new-privileges, bounded resources and disabled admin API are explicit. Certificate/config volumes belong to UID 1000.
- Three media regressions, nine container workflow/restore checks and five HTTPS/Range/SSE checks passed. The runtime-library check also verifies UID/capabilities and the affected utilities/modules listed below. See the evidence files linked from PROGRESS.md.

The complete machine-readable inventory and report hashes are in `evidence/dependency-hardening-2026-10-28.json`. Full reports and image archives stay in ignored `data/dependency-hardening`; no image, recording or credential was uploaded. Counts are package/advisory occurrences, not confirmed exploit paths or numbers of distinct bugs. The previous Bookworm and stock-Caddy reports remain historical evidence.

**Coverage limitation:** the OS package scanner does not identify the custom FFmpeg build. Its source commit was separately queried against OSV and assessed below. A reduction in package-scan findings alone cannot establish that a source build is patched.

## FFmpeg source findings

Source commit: `946fcce07b6dcd0331c8cc609192aeff5e1924f8`, tag n9.0.2. GitHub's tag API reported a valid signature; this is not an independent local GPG verification. Source archive and patch checksums are recorded. The runtime version banner remains 9.0.2; describe it as **9.0.2 plus four backports**, not an upstream release with a new version number.

| Advisory | Treatment in this build |
|---|---|
| CVE-2026-107676, HDR metadata serialization | Applied upstream [2c2f6e9](https://github.com/FFmpeg/FFmpeg/commit/2c2f6e96e31795ae95a8f8323a493ffbc493111f). The regression fails before the patch and passes afterward; it checks initialized bytes and saturation metadata without tone mapping. |
| CVE-2026-107678, MP4 encryption metadata | Applied upstream [969c7eb](https://github.com/FFmpeg/FFmpeg/commit/969c7eb091989a664cb7bf66a1f02051cc46cb52), the relevant source/header/test hunks of [d143451](https://github.com/FFmpeg/FFmpeg/commit/d1434518fbd03789e3e5dc0657a7a9f1123ce074), and [71403a2](https://github.com/FFmpeg/FFmpeg/commit/71403a21b02a92b925e26e609e9bd3e48df451cf). Iterative release and amortized append replace recursive/quadratic handling. 100,000 records crash the unpatched build with a 128 KiB stack and pass afterward; upstream encryption-metadata tests also pass. |
| CVE-2026-107675, SFTP host verification | SFTP, libssh and network protocols are absent. |
| CVE-2026-107677, DASH segment loop | DASH demuxer is absent. |
| CVE-2026-107696, RTSP redirects | RTSP/network protocols are absent. |

`ops/media/apply-and-test.sh` checks patch hashes, reproduces the two original failures, applies patches with zero fuzz, rebuilds and runs the positive regressions. The append backport deliberately omits unrelated master-branch API/version bookkeeping; the complete original patch is retained for comparison. Runtime licenses, build configuration, patches and regression output live under `/usr/share/playable-moments/ffmpeg`.

## Earlier high findings and retained proxy assessment

The previous app report retained **43 high occurrences across eight advisory IDs**; those unused app packages/tools are now omitted from the minimal image. The proxy still retains **one high** in Go JOSE v3.0.5, for which upstream lists no patched v3 release. These historical assessments must not be mistaken for current application package contents. Revisit the proxy assessment if privileges, modules, routes, input handling or operator procedures change.

| Advisory / occurrences | Evidence and limitation |
|---|---|
| util-linux: [CVE-2026-76642](https://security-tracker.debian.org/tracker/CVE-2026-76642), [78408](https://security-tracker.debian.org/tracker/CVE-2026-78408), [78409](https://security-tracker.debian.org/tracker/CVE-2026-78409), [78410](https://security-tracker.debian.org/tracker/CVE-2026-78410): 36 | Privileged mount/helper/cgroup operations are prerequisites. Compose drops all capabilities, sets no-new-privileges and runs UID 1000 with no host devices. The application does not invoke mount/nsenter, and the tested binaries do not link libmount/libblkid. Do not run privileged operator helpers against attacker-controlled paths or relax the container boundary. Packages remain vulnerable. |
| libacl: [CVE-2026-54369](https://security-tracker.debian.org/tracker/CVE-2026-54369): 1 | Requires a privileged pathname-based ACL caller. No setfacl utility; Node, SQLite addon, FFmpeg and FFprobe do not link libacl. Application code does not manipulate ACLs. This does not cover arbitrary operator commands. |
| systemd: [CVE-2026-16742](https://security-tracker.debian.org/tracker/CVE-2026-16742): 2 | Affected systemd-homed daemon is absent; actual app/media binaries do not link systemd/udev. A separate host's systemd is outside this image assessment. |
| ncurses: [CVE-2025-69720](https://security-tracker.debian.org/tracker/CVE-2025-69720): 3 | Debian identifies an infocmp CLI overflow. Application/media binaries do not link ncurses/tinfo and the application never runs infocmp or accepts terminfo input. The CLI package remains installed and flagged. |
| Perl: [CVE-2026-9538](https://security-tracker.debian.org/tracker/CVE-2026-9538): 1 | The affected Archive::Tar module is not available on the image's default Perl module paths; the application does not invoke Perl or extract user tar archives. |
| Go JOSE: [CVE-2026-116587](https://github.com/go-jose/go-jose/security/advisories/GHSA-mgcc-cww5-fp2q): 1 | Go JOSE v3 remains through the certificate-authority dependency. No ACME-server module, JWT/OIDC/provisioner route or public JWK parser is configured; the admin API is disabled. Based on the module/config review, the vulnerable parser is not exposed to visitor requests in this deployment. This is a reachability assessment, not a dependency fix or exhaustive proof. Reassess before enabling PKI administration, ACME serving or other modules. |

Medium, low and unknown findings remain visible in the saved reports and need ongoing review. The x/crypto OpenPGP warning is module-level; the configured proxy does not provide an OpenPGP service. Do not treat a missing severity as proof of harmlessness.

## Maintenance and distribution gates

Before public launch, review these dispositions against the actual host configuration, refresh advisories and scans, review remaining lower/unknown findings, and assign dependency maintenance ownership. Prefer supported upstream fixes when available; do not convert the whole report into an ignore list. Rebuild and rerun the workflow/proxy regressions after dependency updates. Debian packages resolve at build time, so a pinned base does not make every future build byte-identical.

Retained license notices and module/package inventories are evidence, not license-compliance approval. Review FFmpeg/libx264 distribution requirements, including corresponding-source provision and the applied modifications, before sharing an image. No image has been pushed. The Windows launcher still uses its existing media binaries; these Linux patches do not silently replace them.

Existing root-owned Caddy volumes must not be silently reused with this non-root image. Back them up and explicitly migrate ownership before an upgrade; the verified rehearsal used fresh UID-1000 volumes. Do not delete certificate volumes or change ownership on an unverified path.
