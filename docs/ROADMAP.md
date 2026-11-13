# Roadmap — Bunelix

## v0.1.0 — foundation (this repository)

- [x] Monorepo and TypeScript core
- [x] Kernel lifecycle, dependencies, DI, events, screen registry
- [x] Capability policy declaration/check (not a security sandbox)
- [x] CLI (`new`, `make:bundle`, `bundle:list`, `doctor`, `build android`)
- [x] `create-bunelix` npm entrypoint source
- [x] Capacitor-ready Android example source
- [x] Automated kernel/CLI tests and CI workflow
- [x] Architecture, contribution, security and release policy documents
- [ ] Public npm publication and verified install from registry
- [ ] Physical-device Android QA and signed APK/AAB

## v0.2 — framework ergonomics

- [ ] Dependency injection scopes; async service providers and disposal
- [ ] Typed, namespaced event contracts and router navigation lifecycle
- [ ] Environment configuration schema and secret providers
- [ ] Filesystem-backed migrations and storage adapter
- [ ] Integration with native capability adapter (Capacitor plugins)
- [ ] CLI bundle packaging, templates and diagnostic doctor checks
- [ ] Generated app's `make:bundle` typecheck and integration test in CI

## v0.3 — production safety

- [ ] App-bundle permission bridge and native permission prompts
- [ ] Bundle manifest schema, integrity, allowlist and signing checks
- [ ] Migration runner, update and rollback strategy
- [ ] e2e Android test matrix and crash/telemetry opt-in
- [ ] Secure npm publish with provenance, release automation, SBOM
- [ ] Version compatibility CI and deprecation support windows

## v1.0 — stable public contract

- [ ] Supported-platform matrix and LTS support policy
- [ ] High-fidelity API reference; 3 complete sample apps
- [ ] A formally documented permission boundary and trusted publisher policy
- [ ] Migration recipes for breaking changes and automated codemods
- [ ] Bunelix Hub searchable bundle catalogue

GENESIS remains a separate application; an integration example/adapter can later be added without coupling the core to game logic.
