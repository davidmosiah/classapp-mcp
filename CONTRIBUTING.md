# Contributing

Use synthetic data only. Do not submit real profiles, school rosters, messages,
attachments, screenshots, token exports or provider payloads. A redacted real
payload may still identify a child; reproduce its shape synthetically instead.

Before changing code, read [SECURITY](SECURITY.md), the [API contract](docs/API-CONTRACT.md)
and [threat model](docs/THREAT-MODEL.md). Keep tools bounded and stdio local. Do not
add send/reply/read-receipt writes, token refresh, scraping bypasses, decryption,
telemetry, arbitrary URLs/queries or configurable host wildcards.

1. Use macOS with Node.js 24+ (the harness currently uses `/private/tmp`) and `npm ci --ignore-scripts --no-audit --no-fund`.
2. Make the smallest scoped change. Add a regression at the owning boundary for
   security/behavior changes and demonstrate failure before the fix.
3. Run `npm run verify` (build, tests and mutation controls) and
   `git diff --check`. Tests never authorize a live account probe.
4. Inspect a package dry-run when package files change; see [releasing](docs/RELEASING.md).
5. Describe behavior, evidence and remaining limits in the contribution.

A new provider endpoint needs evidence of its semantics and privacy impact,
fixtures, strict input/output projection and separate authorized live acceptance.
GET or GraphQL `query` alone is not proof of read-only behavior. A fresh API
response is not permission to publish or send that content to an AI provider.
Report security findings through the private channel in SECURITY.md.
