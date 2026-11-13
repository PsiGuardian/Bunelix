# Architecture and public API contract

## Layers

1. **`@bunelix/core`**: platform-independent TypeScript kernel; no direct Node.js runtime imports; same code runs in a browser WebView.
2. **Bundles**: `defineBundle()` objects describing services, screens, events, dependencies and lifecycle hooks.
3. **Application host**: selects bundles, constructs the kernel, grants declared capabilities, mounts screens, handles navigation and storage.
4. **Platform adapter**: Capacitor bridges WebView calls to Android/iOS. Native permissions are requested by platform plugins, not Bunelix Core.
5. **Optional API/backend**: Symfony, Laravel, Node.js or any HTTP service; Bunelix is not coupled to a backend.

## Boot sequence

`created -> starting`: validate IDs, versions, dependencies, detect cycles; build dependency order, execute all `register(context)` hooks in that order. Then `boot(context)` in the same order. On failure, shut down any partially booted bundle in reverse order and mark the kernel `stopped`. On successful boot, transition to `running`.

`running -> stopping -> stopped`: reverse-order `shutdown()`; aggregate failures; clear all registries. Kernel instances are deliberately single-use. To restart, construct a new kernel.

## Dependency injection

`services.register('id', factory)` registers a lazy singleton. `services.get<T>('id')` returns its value and detects circular resolution. Async factories are unsupported in v0.1; resolve async resources in `boot` and dispose in `shutdown`.

## SemVer policy

- `0.x` is an **experimental API**. The major API contract is encoded in the `apiVersion` number; incompatible bundles are rejected.
- Bundles declare `version: x.y.z` and optional `{id,minVersion}` requirements. This is a *runtime sanity check*, not a substitute for npm's dependency resolver.
- At `1.0.0`, public API surface, deprecation windows, backward-compatibility tests, supported Node/Capacitor versions and release automation must be fixed and documented.
- Internal paths under `src/` or `dist/` are not public API. Import from `@bunelix/core` only.

## Concurrency and errors

Event dispatch returns a promise and awaits all handlers; handler failures propagate. Bundle authors must unsubscribe from long-lived external subscriptions during shutdown. Hooks are awaited sequentially and native UI rendering is managed by the host. Route paths are registered once per kernel and collisions are rejected.

## No server runtime requirement

Bunelix is not PHP/Symfony. Backends are optional and independent; Composer and Packagist can be used to distribute companion server bundles later.
