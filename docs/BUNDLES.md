# Bundle author guide

A bundle is an npm package exporting a single `BunelixBundle` object from `@bunelix/core`'s public interface. It may register services, routes, and event listeners.

## Naming

Use a unique scoped npm package such as `@vendor/camera-bundle`, and a unique runtime ID such as `vendor.camera`. Runtime dependencies must explicitly list required bundle IDs. A bundle never mutates the kernel internals.

## Manifest and lifecycle

- `id`: unique lowercase identifier.
- `version`: `MAJOR.MINOR.PATCH`.
- `apiVersion`: `1` for Bunelix 0.1.
- `requires`: array of `{id, minVersion?}`; missing dependencies and cycles fail fast.
- `permissions`: declared native capability names (`camera`, `storage`, `notifications`, `filesystem`, `geolocation`).
- `register`: establish services and screens; avoid network or permission prompts here.
- `boot`: optional resource acquisition after all bundle registrations.
- `shutdown`: optional cleanup, called in reverse dependency order.

## Security limitations

The `capabilities.require` check enforces the app's *policy at the Bunelix API boundary* only. JavaScript imported into the same runtime retains normal JS/WebView privileges and can call browser APIs directly. **It is not a security sandbox**. Untrusted marketplace bundles must not be loaded without additional isolation, review, signing and explicit host enforcement. Android runtime permissions are controlled by the OS and Capacitor plugins.

## Publication policy (planned, not yet operational)

- Source repository and license required.
- Automated tests and bundle manifest validation.
- Declared runtime capabilities with human-readable explanations.
- Vulnerability reporting channel and deprecation policy.
- Provenance attestations, dependency review and signed releases for trusted publisher badges.
- No dynamic remote JavaScript injection into published mobile apps.

Npm provides package distribution; the planned Bunelix Hub will be a discovery/indexing layer, not a replacement package registry.
