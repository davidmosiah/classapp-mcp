# Local setup and troubleshooting

This candidate is validated on macOS with Node.js 24+ and POSIX ownership checks.
Linux runtime and harness compatibility are unverified; Windows is unsupported.
Use a trusted local MCP client. It is not a remote or multi-user service. Live
setup is manual and has not been established as a simple onboarding flow across
other parents' accounts. Try synthetic mode first.

## 1. Build and connect without credentials

From the source root:

```sh
node --version
npm ci --ignore-scripts --no-audit --no-fund
npm run build
```

Use `examples/mcp.offline.json`. Replace `/absolute/path/to/node` with your Node
24+ executable and the source path with this installation's `dist/index.js`.
Start/reload the client using its own instructions. Call `classapp_status`, then
`classapp_list_entities`. Expect `mode: offline` and synthetic profiles. A command
run directly in a terminal waits for JSON-RPC, so silence is not authentication.

## 2. Decide whether to connect a real account

Confirm that you are entitled to access the account/profile and that your school,
provider terms and AI client's data policies permit the intended use. The
connector has no separate reduced-scope credential: a stolen session token may
have broader powers in the provider than these five tools expose. Sharing
notices with a cloud model can expose information about children and others.

Never ask a child, school employee or another parent to give you a token. Never
upload a token to chat or a token-decoding website. This project has no hosted
credential collector or login page.

## 3. Prepare private storage

Choose a canonical absolute path outside every Git checkout, cloud-synced folder,
shared/public folder and browser downloads directory. On macOS, avoid symlinked
paths such as `/tmp`; use canonical paths. For example, on a trusted personal
computer, with a home directory that is not cloud-synced:

```sh
umask 077
mkdir -p "$HOME/.config/classapp-mcp/downloads"
chmod 700 "$HOME/.config/classapp-mcp" "$HOME/.config/classapp-mcp/downloads"
touch "$HOME/.config/classapp-mcp/session.json"
chmod 600 "$HOME/.config/classapp-mcp/session.json"
```

If a file already exists, do not overwrite it blindly. Use its intended account
and verify its permissions. The credential parent and download directory must
belong to you and grant no group/other access. Private files must be regular,
owner-only files. Paths containing symbolic links are rejected. This does not
automatically protect backups, editor recovery files or storage sync.

## 4. Supply your own existing authorized session locally

Sign in directly to the official ClassApp web app. If you understand browser
DevTools, inspect a normal authorized request to
`https://web.classapp.com.br/graphql` and identify its access token in the
Authorization header. Do not export a HAR, copy the whole request or share a
browser profile. Do not trigger extra account actions for token collection.
If you cannot identify this safely, stop and keep using the official app.

Open the precreated `session.json` in a **trusted local editor**, with cloud sync,
AI extensions and remote collaboration disabled. Store one JSON field only:

```json
{"accessToken":"REPLACE_LOCALLY_WITH_YOUR_OWN_ACCESS_TOKEN"}
```

The displayed value is a placeholder, not a valid account. Paste only the token,
without the `Bearer ` prefix. Do not put its real value in command arguments,
shell history, environment variables, MCP configuration, source files, chat,
issues or screenshots. Close the editor and ensure its backup/recovery files did
not create another readable copy. Clear the token from your clipboard if your
clipboard tools retain history. Recheck mode 0600 after saving.

The server has no login/refresh flow. On expiration, use official controls to
renew the session and replace the file locally. Do not weaken validation to make
an expired credential work.

## 5. Enable the existing client entry

Copy the structure in `examples/mcp.live.json`, replacing all paths with your
canonical paths. MCP configuration contains paths **only**, not the token. Set:

- `CLASSAPP_MODE=live`
- `CLASSAPP_CREDENTIALS_FILE`: your private `session.json`
- `CLASSAPP_DOWNLOAD_DIR`: your private existing downloads directory

Reload the client. `classapp_status` reports configuration and mode; it does not
prove successful login. `classapp_list_entities` is the smallest provider check.
Choose a returned profile you are authorized to use. Do not assume a tool can
access only one child if the session can access several profiles.

Reading a message explicitly disables known read-status update flags, but future
backend effects are not guaranteed absent. Confirm critical information in the
official app. Do not automatically open attachments; treat them as untrusted.

## Errors

| Symptom | Action |
| --- | --- |
| `INVALID_MODE` | Use exactly `offline` or `live` |
| `CREDENTIALS_REQUIRED` / `UNSAFE_CREDENTIALS` | Check absolute path, JSON shape, owner-only file and private parent; never print the file for diagnostics |
| `UNSAFE_STORAGE` | Move private storage outside all Git checkouts, including worktrees; do not disable the check |
| `UNSAFE_PATH` | Use an existing canonical directory with trusted ownership, no symlinks and mode 0700 |
| `API_ERROR` / `HTTP_ERROR` | Session may have expired, access may be denied or the provider contract may have changed; verify in the official app |
| `NETWORK_POLICY` | A host/address is outside reviewed policy; do not add a wildcard or arbitrary endpoint |
| `SIZE_LIMIT` | Open the resource through official controls; there is no bypass parameter |
| `TIMEOUT` / `NETWORK_ERROR` | Check connectivity; no automatic retries run. Do not repeatedly probe a failing provider |
| MCP protocol/startup errors | Verify the client uses Node 24+, the built path, and clean stdio; never share token-bearing logs |

Stop the client entry to disconnect. Removing the entry does not revoke the
provider session or delete downloaded files. Use official session controls for
revocation and your own privacy policy for local retention.
