# Security policy

**Supported security-fix versions:** none yet. Bunelix `0.1.x` is experimental and has not received an external security audit. Do not treat it as a secure untrusted-bundle runtime.

## Reporting vulnerabilities

Please use GitHub's **Report a vulnerability** / private security advisory feature for `PsiGuardian/Bunelix` if available; otherwise contact the repository owner privately before any public disclosure. Do not place exploits, credentials or private user data in issues.

## Trust boundaries

- Bundles are JavaScript loaded into the application runtime, with the authority of that runtime. Capability declarations are policy metadata, not code isolation.
- Capacitor native permission prompts and the operating system determine actual device permissions.
- Treat third-party bundles as trusted code dependencies; review releases, dependencies and provenance before installation.
- Do not load remote executable JavaScript as an "update" mechanism in production mobile apps.
- Keep secrets on the server or in dedicated platform secure storage; never ship API secrets in app assets.

## Release gating (required before stable 1.0)

Dependency scanning, reproducible lockfiles, automated builds, software provenance, security review of CLI generation and native integrations, audit trail and published support windows.
