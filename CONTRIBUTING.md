# Contributing

Contributions are welcome. Open an issue describing scope and expected behavior before large API changes. Prefer small pull requests with tests, documentation and backwards compatibility considerations.

## Development quality gate

```bash
npm install
npm run check
```

Code should be TypeScript strict, avoid runtime dependencies in `@bunelix/core`, and import only documented public modules. Add tests for lifecycle order, failure recovery, permission behavior and CLI filesystem safety when changing those areas.

## Pull request checklist

- [ ] Add tests (success and failure paths)
- [ ] Update user-facing documentation and changelog for public changes
- [ ] Explain security impact and any new native permissions
- [ ] Avoid breaking API changes without an explicit migration note
- [ ] Confirm no secrets, binaries or generated `android/` directories committed

See [SECURITY.md](SECURITY.md) for private vulnerability reporting guidance. Please do not post exploitable vulnerability details to public issues.
