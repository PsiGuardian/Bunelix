# Bunelix ✦

**Build once. Extend everywhere.**

An open-source TypeScript application framework built around **independently distributable bundles**, inspired by the modularity, developer experience and release discipline of Symfony. Bunelix targets Web apps and mobile apps via [Capacitor](https://capacitorjs.com/). It is **not affiliated with Symfony**.

> **Status: 0.1.0 pre-release, experimental.** The kernel and CLI are implemented and unit-tested. The npm packages are **not yet published**; the Android example provides a Capacitor-ready project, **not a compiled APK**. Security policy enforcement does **not** sandbox untrusted JavaScript bundles. Do not run unknown bundles in production.

## What's in the monorepo

| Package | Responsibility |
| --- | --- |
| `@bunelix/core` | Kernel lifecycle, lazy DI, event bus, screens, dependency validation, capabilities policy |
| `@bunelix/cli` | `new`, `make:bundle`, `bundle:list`, `doctor`, `build android` |
| `create-bunelix` | Future `npm create bunelix@latest` entrypoint |
| `examples/hello-android` | Working source example with two bundles, Vite and Capacitor configuration |

## Development (Node.js 22+; LTS recommended)

```bash
# Clone then install with network access (npm workspaces)
git clone https://github.com/PsiGuardian/Bunelix.git
cd Bunelix
npm install
npm run check

# Start the Android/Web reference application
npm run example:dev
```

The Android example needs an Android SDK/JDK for native compilation:

```bash
cd examples/hello-android
npm run android:add     # creates android/; once per app
npm run android:sync    # builds Web and copies to Android
npm run android:open    # Android Studio (build/run)
```

Capacitor's native project is generated locally and excluded from Git. The CLI's `bunelix build android` attempts the Gradle `assembleDebug` step once the SDK is configured.

## New application and bundles

After publishing the npm packages, developers can use:

```bash
npm create bunelix@latest my-application
cd my-application
npm install
npx bunelix make:bundle Camera
npx bunelix bundle:list
npm run dev
```

**For now**, use `node packages/cli/dist/cli.js new my-application` inside the cloned repository after `npm run build`. The generated app references unpublished `@bunelix/*` packages; use the included workspaces example for end-to-end execution until npm publishing is complete.

### Bundle API

```ts
import { defineBundle } from '@bunelix/core';

export const JournalBundle = defineBundle({
  id: 'example.journal',
  version: '0.1.0',
  apiVersion: 1,
  requires: [{ id: 'example.welcome', minVersion: '0.1.0' }],
  permissions: [],
  register({ screens, services, events }) {
    services.register('journal.counter', () => ({ value: 0 }));
    screens.add({path: '/journal', title: 'Journal', mount(root) {
      const heading = document.createElement('h1');
      heading.textContent = 'Journal'; root.append(heading);
    }});
    events.on('journal.updated', () => console.info('Updated'));
  },
  boot() { /* optional */ },
  shutdown() { /* cleanup optional */ }
});
```

`register` runs in dependency order before `boot`, and `shutdown` executes in reverse order. Errors during boot trigger rollback. Services are synchronous lazy singletons. Bundle dependencies currently support a strict minimum version **within the same major**; full npm semver resolution remains delegated to npm.

## Documentation

- [Architecture and API contract](docs/ARCHITECTURE.md)
- [Getting started](docs/GETTING_STARTED.md)
- [Bundles and permissions](docs/BUNDLES.md)
- [Roadmap and stability](docs/ROADMAP.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## Design principles

1. **Explicit over magic**: no runtime downloads or automatic execution of third-party code.
2. **Deterministic lifecycle**: predictable dependency order and teardown.
3. **Stable boundaries**: documented public imports, semver and contract tests.
4. **Mobile-first ergonomics**: Android/iOS platform integration remains Capacitor's responsibility.
5. **Least privilege**: native capabilities must be explicitly declared and approved. The current policy check is advisory without a sandbox.
6. **Reproducible releases**: signed tags, CI, changelog and release checklists before a stable 1.0.

License: MIT. See [LICENSE](LICENSE).
