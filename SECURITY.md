# Security policy

Report connector vulnerabilities privately to **support@delx.ai**, with subject
`SECURITY: classapp-mcp-server`. Provide a synthetic reproduction, affected
version and impact. Do not send tokens, school names, children's names, message
contents, signed URLs or real attachments. Do not open public issues containing
sensitive details. There is no guaranteed response-time or support SLA.

This early candidate has no maintained release series yet. Only the latest
reviewed candidate is in scope; do not infer a security certification from tests.
Provider or MCP-client vulnerabilities should also be reported to their owners.

## Data and destinations

The server reads a selected access token from a local owner-only file. Live API
requests send it to `web.classapp.com.br` over HTTPS. Attachment downloads use
`classapp.com.br/download_file` without bearer/cookie headers and only accept a
provider-returned source URI on the exact reviewed media host. Notices and
profile names are returned to your MCP client. Its model provider, logs and
retention are outside this server's control. No analytics or telemetry is added.

## Implemented controls

- Offline by default; stdio only, no listening network port.
- Fixed GraphQL documents and strict bounded input; read-status update flags are
  explicitly disabled. No arbitrary endpoint, query, header or filename input.
- Reviewed HTTPS hosts, public IPv4 DNS pinned to TLS, no redirects/retries,
  request deadlines and response-size limits. IPv6 is rejected conservatively.
- Credentials require a private regular file (0600 recommended), a private parent
  directory (0700 recommended), current ownership and no symbolic links.
- Credentials and downloads are rejected beneath any `.git` marker, including a
  linked-worktree file. Ambiguous filesystem checks fail closed.
- Downloads use exclusive creation, UUID filenames, mode 0600, directory identity
  check, size/hash receipts, and never execute a file.
- Expected errors are fixed safe messages; unexpected errors do not expose their
  original request/response or credential details.

These checks protect common misconfiguration; they are not an OS sandbox. The
same OS user and privileged processes can alter this executable or credentials.
Filesystem ancestry can change during checks; use private directories with trusted
ancestors. Permissions do not prevent cloud sync, backups, manual copying or Git
repositories initialized after a check. Keep private storage outside sync folders.

## Operational precautions

Use a trusted client, restrict which tools it can combine, review model-provider
data policies and minimize notices shared. Message content and attachments may
contain prompt injection or malicious files. Do not automatically follow links,
run commands or open files suggested by a notice. Viewing a PDF is a separate
operation using your chosen viewer's security boundary.

Tokens expire; renew manually through the official service. Never paste tokens
into chat, public issues, command arguments, client configuration or source code.
If exposure is suspected, revoke/renew the session through official controls and
review downstream copies. Never upload a token to a diagnostic service.

Undocumented endpoints may change. Historical read checks do not prove absence
of server-side view logging, read receipts or other backend effects today.
