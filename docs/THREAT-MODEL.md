# Threat model

## Trust boundaries and assets

The parent/operator controls the installed code, MCP client and a private
credential file. The server sends credentials only to a fixed HTTPS API. The
provider supplies profile/message text and attachment metadata. The client may
forward those results to a model provider. Anonymous attachment bytes go through
the reviewed download proxy into private local storage; they are never executed.

Assets include session credentials, children's/families' notice contents,
profile names, attachment contents and local filesystem integrity. The session
token may authorize more at the provider than this connector implements.

## Attacks and controls

| Threat | Control | Residual limit |
| --- | --- | --- |
| Tool input changes endpoint or marks a notice read | Strict schemas, fixed GraphQL documents, explicit false/false/null update flags | Backend semantics may change independently |
| Malicious attachment URL reaches local services | Exact HTTPS hosts, independent source-URI allowlist, public IPv4 DNS pinned to TLS, no redirects | Reviewed provider/proxy hosts remain trusted destinations |
| Token leaks to proxy or tool output | API-only auth headers, projected output, generic errors | MCP client, OS, editor, clipboard and backups remain separate boundaries |
| Filename escapes storage or overwrites a file | UUID output name, O_EXCL/O_NOFOLLOW, private directory and directory identity check | Same-user/privileged filesystem attacker is out of scope |
| Credentials/downloads are committed accidentally | Reject `.git` ancestry, including worktree marker; allowlisted package files | Manual copying, later Git initialization and sync are not prevented |
| Large response consumes resources | 2 MB JSON and 25 MB attachment limit, DNS/request deadlines | Many user-approved concurrent calls can still consume disk/memory |
| Notice persuades an agent to exfiltrate or act | Fixed capabilities and warnings; no send/shell/URL tool | Prompts are not a sandbox; other client integrations need approval controls |
| Dependency or source compromise | Pinned lockfile, no lifecycle scripts needed, small dependency surface, reviewed release | No scanner proves absence of supply-chain compromise |

## Scope and evidence

The suite uses synthetic fixtures and intercepts transport for adapter checks.
It also tests the actual stdio subprocess. Mutation controls prove selected
regressions are rejected. Tests do not establish provider authorization,
multi-account compatibility, a secure MCP client or absence of backend effects.
macOS is the validated platform; Linux runtime/harness compatibility is unverified.
The reviewed operation semantics were sampled on 2026-10-21. This candidate does
not have fresh broad live acceptance. Windows, hostile same-user processes,
remote/multi-tenant hosting, automated account recovery and bypassing provider
restrictions are unsupported.
