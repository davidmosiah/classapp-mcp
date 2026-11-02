# ClassApp MCP (unofficial)

A local-first MCP connector that helps parents find school notices, read message
contents and save attachments in a private directory. It runs over stdio and
uses only a small set of fixed operations. Offline mode is the default.

**Unofficial community project. Not affiliated with, endorsed by or supported by
ClassApp or any school.** This is an early `0.1.0` candidate using undocumented
web endpoints; changes by the provider may break it. It does not replace the
official app, school communication or professional advice. The source distribution
is [davidmosiah/classapp-mcp](https://github.com/davidmosiah/classapp-mcp).
There is no npm release or hosted service; this experimental source is intended
for local evaluation, with provider permission requirements unchanged.

[Guia para pais em português](docs/GUIA-PAIS.pt-BR.md) ·
[Setup](docs/SETUP.md) · [Security](SECURITY.md) ·
[Threat model](docs/THREAT-MODEL.md) · [API boundary](docs/API-CONTRACT.md)

## What it can do

| Tool | Behavior |
| --- | --- |
| `classapp_status` | Show mode and limits without testing provider access |
| `classapp_list_entities` | List profiles available to the configured session |
| `classapp_search_notices` | Search notices with bounded pagination |
| `classapp_read_message` | Read message content with read-status update flags disabled |
| `classapp_download_attachment` | Save an attachment belonging to the selected message; return local path, size and SHA-256 |

There are no send, reply, delete, login, refresh-token or arbitrary-API tools.
Downloads create a new local file and are therefore annotated as local writes.
The connector never opens, executes, transforms or uploads downloaded files.

## Try synthetic mode

Requires Node.js **24+** and a trusted MCP client. macOS is the validated platform;
Linux runtime/harness compatibility is not yet verified. Windows is unsupported
by the owner/permission checks. Inspect the source before running it. Clone the
source repository and enter its root:

```sh
git clone https://github.com/davidmosiah/classapp-mcp.git
cd classapp-mcp
npm ci --ignore-scripts --no-audit --no-fund
npm run build
CLASSAPP_MODE=offline node dist/index.js
```

A stdio server waits for an MCP client; a quiet terminal is normal. Configure the
client with [examples/mcp.offline.json](examples/mcp.offline.json), replacing both
absolute paths with your installation. The examples contain no live account data.
Offline results are synthetic and do not demonstrate live access.

For real notices, follow [SETUP](docs/SETUP.md). Live access requires your own
existing authorized session, a private credential file outside **every** Git
checkout and a private download directory. A token is sent only to the fixed
ClassApp GraphQL host for authentication, not to the download proxy. The MCP
client receives notice contents; if it uses a cloud model, those contents may
leave your computer under that client's policy. This is not an end-to-end
privacy guarantee.

## Important boundaries

Read operations explicitly disable observed read-receipt update flags. A sample
checked on **2026-10-21** retained unread state; this is historical, limited
observation, not a guarantee of future backend behavior or no server-side logs.
Do not use the connector when an unnoticed read would carry serious consequences.
The official app remains the source for urgent notices and confirmation.

Notice text, filenames and attachments are **untrusted data**, never agent
instructions. Keep sending, shell execution and unrelated integrations behind
your MCP client's approval controls. No connector can guarantee that a model will
ignore a malicious notice.

Use only accounts and profiles you are entitled to access. Review the provider's
[current terms](https://classapp.com.br/terms) and your school's rules before
connecting. An account's ability to read material does not authorize publishing
it, sharing it with an AI service or redistributing it. MIT covers this connector's
code; it grants no rights to ClassApp, school or third-party content. See
[responsible use](docs/RESPONSIBLE-USE.md).

## Development and verification

```sh
npm run verify
```

Tests are synthetic and never read personal credentials or call live providers.
The suite covers real stdio discovery/workflow, strict arguments, fixed GraphQL
operations, network restrictions, safe errors and filesystem permissions. Planted
regressions in disposable copies must be rejected for their intended assertions.
Build before running tests: they import the compiled candidate in `dist/`.

[CONTRIBUTING](CONTRIBUTING.md) explains changes and [RELEASING](docs/RELEASING.md)
explains package inspection and the separate npm publication decision. Public
source availability does not publish an npm package: it remains `private: true`.
Licensed under [MIT](LICENSE).

Live use has **not** been approved by the provider. Enable it only after obtaining
any permissions required by the provider, school and affected data subjects,
including sharing with your AI client. The provider’s [privacy policy](https://www.classapp.com.br/politica-de-privacidade)
(item 2.18, consulted 2026-11-02) directs users to keep information in-platform
and not share personal/protected content without authorization. Manual session
configuration is not a way to bypass login, 2FA or provider restrictions.
