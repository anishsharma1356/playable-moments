# Dependency notices and distribution checklist

28 October 2026. Original Playable Moments code is now under the root [MIT license](../LICENSE), credited to Anish, following the user's delegation of this decision. This file records third-party evidence and distribution boundaries; it does not relicense those components or certify all possible forms of distribution.

The final runtime tree contains **85 JavaScript packages**, all with declared license metadata. [The inventory](evidence/runtime-license-inventory-2026-10-28.json) records package versions and notice hashes; [collected original notices](licenses/runtime-npm-notices.txt) preserve the available top-level license/copyright/notice files. The collector is `ops/license-inventory.mjs` and runs offline against the built image. It excludes development tools and non-JavaScript components.

The inventory discovered 224 packages in the previous image's virtual store, despite missing top-level dev symlinks. The Dockerfile now deletes that dependency tree and performs a fresh locked, offline production install. Container smoke checks also inspect the internal virtual store. Earlier claims of development-tool absence were limited to top-level paths; this follow-up closes that gap.

## Retrieved upstream notice

`abstract-logging@2.0.1` declares MIT but ships no top-level license file. Its bundled `Readme.md` points to `http://jsumners.mit-license.org/`. The full linked notice was retrieved over HTTPS on 28 October and saved as [abstract-logging-MIT.txt](licenses/abstract-logging-MIT.txt), with source and extraction hashes in [retrieval evidence](evidence/abstract-logging-notice-2026-10-28.json). The service renders the current year (2026) and obscures the email; the visible upstream notice is retained as served. The earlier package inventory correctly still reports no bundled top-level notice; this supplement closes that collection gap. Package metadata alone is not a compliance decision.

## Non-JavaScript components

- FFmpeg: built with `--enable-gpl --enable-libx264`, so it must not be described as an LGPL-only build. Upstream explains this in [FFmpeg LICENSE.md](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/LICENSE.md). The image retains COPYING files, configuration, four patches and regression evidence under `/usr/share/playable-moments/ffmpeg`. The source archive checksum and patch hashes are in DEPENDENCY_SECURITY.md and its evidence.
- Debian libraries, including x264/dav1d: the minimal runtime preserves each selected package's `/usr/share/doc/*/copyright`, `/usr/share/common-licenses` texts and source/version information. Node's full upstream notice is copied to `/usr/share/licenses/node/LICENSE`; native SQLite binding notices remain with the installed package.
- Caddy/Go: the proxy image retains module notices and toolchain license under `/usr/share/licenses`; `ops/proxy/collect-licenses.sh` and go.sum record collection inputs.
- Windows FFmpeg is a separate downloaded build under ignored `.tools`; the Linux inventory does not cover its distribution.

Before sharing binaries/images, assemble and verify the applicable corresponding-source/materials for FFmpeg, linked libraries and modifications, and review all required notices. A Dockerfile and download link alone are not a completed source-distribution package. No container image has been pushed.

Before publishing source, document recording/asset rights, retain third-party notices and review the actual repository contents. The original-project license decision is complete: MIT, credited to Anish. Security dispositions remain in [DEPENDENCY_SECURITY.md](DEPENDENCY_SECURITY.md); license metadata does not resolve vulnerability findings.

## Prepared release boundary

The prepared submission is a **source repository with build instructions**. It excludes container archives, Node/FFmpeg executables, installed dependencies, recordings, database backups and credentials. Third-party dependencies are obtained by the recipient's build. This avoids making a prebuilt binary distribution part of the initial submission; it does not waive notices for third-party source that is included.

The upstream FFmpeg patches under `ops/media` retain their source-file terms and attribution. The package includes four upstream patches plus the locally adapted append backport; the original append patch is retained for comparison. The patched encryption-info and MOV source files carry **LGPL version 2.1 or later** headers, so the complete [LGPL version 2.1 text](licenses/FFmpeg-COPYING.LGPLv2.1) is now retained alongside the [GPL version 2 text](licenses/FFmpeg-COPYING.GPLv2). The combined FFmpeg executable configured with `--enable-gpl --enable-libx264` is GPL-enabled; this build setting does not mean every upstream source file originally carried the same license. Original-file terms remain authoritative. Any MIT choice for original Playable Moments code does not relicense those patches, dependency notices or third-party assets.

Do not attach prebuilt images or downloaded media tools to the repository/release until a complete corresponding-source and notice package has been assembled and checked. Running a privately built GPL program on a server and distributing its binaries are different cases in the [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html#UnreleasedMods). This records the planned technical distribution boundary; no binary distribution has been approved or completed.

The [root LICENSE](../LICENSE) is the active MIT grant for original project code, credited to Anish. The [earlier proposal](licenses/PROJECT_LICENSE_PROPOSAL.txt) is retained with its applied status. The FFmpeg-derived patch files, dependency license texts, Twitch branding, and third-party recordings/assets retain their own terms. Recording consent and final video permissions remain separate from the code license; no rights to a person's likeness or Twitch trademarks are granted by this MIT license.

## Source review follow-up — 30 October 2026

Compared the pinned upstream [FFmpeg license](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/LICENSE.md) with the [encryption-info](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavutil/encryption_info.c) and [MOV](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/mov.c) file headers. Added the missing LGPL text from the exact n9.0.2 tag, SHA-256 `246041b6ecf9bc32d718a62c57877c78b5eb397b6467e74ed7ae2626ab189c30`. Upstream patches and their checksum file were not changed. Review the final repository contents again when the new demonstration example is chosen; no third-party sample video is included or authorized by this notice review.
