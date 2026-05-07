# Security Policy

## Reporting a vulnerability

This repository hosts the source for **[docs.sharpapi.io](https://docs.sharpapi.io)** — the public documentation site for the SharpAPI service. If you have found a security issue:

- **In the SharpAPI product or API itself** (data exposure, auth bypass, etc.):
  email **security@sharpapi.io** with details. Please do not file a public
  GitHub issue. We aim to acknowledge within 2 business days.

- **In this docs repository specifically** (e.g., a leaked credential
  committed in history, an XSS in an MDX page, a build-pipeline issue):
  email **security@sharpapi.io** as well. Mention `docs.sharpapi.io` in the
  subject line so it routes correctly.

When reporting, please include:

- A clear description of the issue and its impact
- Steps to reproduce
- Affected file path, commit SHA, or URL where applicable
- Your preferred contact method for follow-up

## Scope

In scope:

- The contents of this repository (`docs.sharpapi.io`)
- The deployed site at `https://docs.sharpapi.io`
- The SharpAPI service itself (`https://api.sharpapi.io`,
  `https://ws.sharpapi.io`, `https://sharpapi.io`)

Out of scope:

- Reports based on outdated software versions where a fix has already been
  released
- Self-XSS, social engineering, and physical attacks
- Findings from automated scanners without a working proof of concept

## Disclosure

We coordinate disclosure with the reporter. Once a fix has shipped and any
affected customers have been notified, we are happy to credit reporters who
wish to be acknowledged.
