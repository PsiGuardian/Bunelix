# Getting started

## Local development

Requirements: Node.js 22+ (prefer a supported LTS), npm, and for Android a JDK and the Android SDK.

```bash
git clone https://github.com/PsiGuardian/Bunelix.git
cd Bunelix
npm install
npm run check
npm run example:dev
```

Vite prints its development URL. For mobile browser testing, connect the phone to the same Wi-Fi as the computer, and open the computer's LAN IP and printed port. Do not expose a development server to the Internet.

## Build an APK

```bash
cd examples/hello-android
npm run android:add
npm run android:sync
npm run android:open
```

Open Android Studio and build/install on an Android device. The repository does **not** include the SDK, an `android/` folder or an APK; Capacitor generates the native Android project on demand.

## CLI demo

```bash
npm run build
node packages/cli/dist/cli.js new my-app
cd my-app
node ../packages/cli/dist/cli.js make:bundle Camera
```

The last command is intended as a CLI generator demonstration. The generated app uses package names reserved for future publication; they are not available through npm yet. Use `examples/hello-android` for a buildable in-repository app.

## Before distributing an app

- Configure a unique `appId`, signing, icons, privacy policy and permissions.
- Test on multiple Android screen sizes and supported OS versions.
- Use only audited third-party bundles and pinned lockfiles.
- Run tests on actual hardware; CI Web builds alone do not validate native permissions.
