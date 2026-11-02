# Reviewed request boundary

Investigation date: 2026-10-21. Source material: public ClassApp web application
GraphQL documents observed in public application sources. Only these operation paths are
implemented, with documents fixed in `src/operations.ts`:

| Tool | Fixed GraphQL path | State protections |
| --- | --- | --- |
| list_entities | viewer.entities(limit: 40) | Does not access message resolver |
| search_notices | node(Entity).messages(limit, offset, search) | Bounded variables, no supplied selection or field arguments |
| read_message | node(Entity).message(id, filterTagsByEntity: true) | Explicit deleteNotifications:false, updateAccessed:false, updateStatus:null |
| download_attachment | Same protected message query, then files returned by medias(type: FILE, limit: 40) | Attachment ID must belong to response; original CDN URI independently allowlisted; fixed public download proxy; no authorization header |

GraphQL is served at `https://web.classapp.com.br/graphql`. Authentication is a
Bearer access token. No login, refresh or cookie-reading code is included.

A crucial source finding: the web client's `MessageNodeEntityUpdateQuery` is a
**query**, but passes `updateStatus: READ`, `deleteNotifications: true` and
`updateAccessed: true` to `Entity.message`. HTTP verbs and GraphQL query/mutation
keywords therefore cannot determine read-only behavior. The server accepts only
its fixed operation names/documents, validates variables strictly, and never
accepts raw GraphQL, arbitrary field arguments or mutation flags from MCP input.

A limited sample checked on 2026-10-21 retained its unread field, unread-folder
membership and unread count after the protected message request. This historical
observation does not establish current behavior across accounts or prove absence
of backend effects. The sole approved attachment source host is
`classapp-live-media-1.olaisaac.io`; other hosts fail closed. Direct CDN access
was not supported for the observed sample, so downloads use the fixed frontend
route `https://classapp.com.br/download_file`, with `path` built only from the
validated provider URI and `name` sanitized from provider metadata. Redirects
remain disabled; bearer and cookie headers are never sent to the proxy or CDN.

The provider returns `unread` as a numeric value or null, not a boolean. Tool output preserves it as `unreadRaw` without assigning a meaning to numeric values.

Response shaping excludes signed attachment URLs from tool results. It returns
only message content and attachment IDs/names/mime types. Content is treated as
untrusted data and is not rendered, executed or fetched as secondary HTML assets.

Private runtime content belongs outside this repository. No family identifiers,
real messages, access tokens, screenshots or downloaded real attachments may be
added to Git. Private investigation outputs are not release artifacts.
