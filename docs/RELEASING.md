# Preparing a release candidate

The source distribution target is [davidmosiah/classapp-mcp](https://github.com/davidmosiah/classapp-mcp),
using a reviewed sanitized snapshot with its own public history. The original
private development history remains local and must not be pushed there.

Npm publication is a separate maintainer decision. This working package
intentionally has `private: true`; no command here publishes. Keep that guard
until the exact npm candidate and destination are separately approved.

## Required evidence

- Node.js 24+, locked dependencies installed with scripts disabled.
- `npm run verify` (build, tests and mutation controls),
  `git diff --check`; record candidate revision/diff, environment and exit codes.
- Review current dependency advisories (`npm audit --omit=dev`) and triage results.
- Inspect every tracked file and publication artifact for secrets, personal
  paths, account/family data, provider payloads and material without redistribution
  rights. A scanner alone is not proof that all private data is absent.
- Check documentation links/examples and the actual setup flow. Clearly label
  synthetic checks and historical/live evidence; never turn offline pass into
  live certification. Broad account compatibility remains unproven.
- Re-read the actual security boundaries and outstanding findings. Keep any
  unresolved readiness issue visible rather than weakening a gate.

## Source publication boundary

The existing local history was created for a private workspace and contains
machine-specific paths in older documentation. **Do not publish that `.git`
history.** Preserve it locally. Prepare a fresh sanitized source snapshot from
the reviewed candidate, without `.git`, runtime directories, credentials,
downloads, outputs or private receipts. Review each snapshot before updating the
public source repository. Do not use this note as permission to rewrite/delete history.

## Package inspection

From the built source root:

```sh
npm pack --dry-run --json --ignore-scripts
```

The allowlist includes only compiled JavaScript, public documentation, license
and generic JSON client examples. The legacy evaluation fixture and local test/
release scripts are not package files. No installation lifecycle script is
required. Source publication may include synthetic tests separately after review.

For a real local tarball, select a private staging directory outside the checkout:

```sh
npm pack --json --ignore-scripts --pack-destination /absolute/private/staging
```

Inspect the archive's complete file list and bytes, then install in a disposable
local environment with scripts disabled and exercise offline stdio using its
actual packaged entrypoint. Confirm mode, discovery, strict inputs and private
download behavior. Record its SHA-256. Do not distribute the artifact merely
because the packaging command succeeded.

Before any publication, recheck target identity, package/repository name, license,
private vulnerability-reporting channel, current provider terms, required human
approval and exact artifact. Do not invent repository links, registry availability
or a successful live run. No new hosted CI runner is required by these docs.
