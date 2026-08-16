# Security Policy

## Supported version

Security fixes are applied to the latest release on the `main` branch.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's
[private vulnerability reporting](https://github.com/lydia1204/MMM-NewLegoSets/security/advisories/new)
to send a description, affected version, reproduction steps, and potential
impact. Do not include real API keys, private MagicMirror configuration, or
personal network details in a report.

You should receive an initial response within seven days. A fix and disclosure
timeline will depend on severity and reproducibility.

## Security boundaries

- The test editor binds to `127.0.0.1` by default and is not an authenticated
  multi-user service.
- Remote editor binding is refused unless `ALLOW_REMOTE=true` is explicitly
  set. Only use that option on a trusted network with a separate firewall or
  authenticated reverse proxy.
- The module accepts a Brickset API key through the local MagicMirror
  configuration. Never commit a real key. The editor removes this key before
  persisting configuration to browser storage.
- Product requests are restricted to HTTPS hosts under `lego.com` and
  `brickset.com`.
