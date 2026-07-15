---
name: flutter_app missing native project scaffold (root cause of App Store black screen)
description: Why the QIROX flutter_app kept showing a black screen after Codemagic publishes, and what a real fix requires
---

## Root cause
`flutter_app/ios/` and `flutter_app/android/` only ever had customization files
committed to git (`ios/Runner/Info.plist`, `android/app/build.gradle`,
`android/app/src/main/AndroidManifest.xml`). The actual native project scaffold —
`ios/Runner.xcodeproj`, `AppDelegate.swift`, `Assets.xcassets`, the
`LaunchScreen` storyboard, `ios/Flutter/*.xcconfig`, and the whole Android
Gradle wrapper/root `build.gradle`/`settings.gradle` — was never in git history
at all (confirmed via `git ls-tree` / `git log --diff-filter=D`). Codemagic was
never building a real, complete app from this repo state, however the app got
onto TestFlight/App Store.

## Fix pattern
1. Install Flutter via `installSystemDependencies({ packages: ["flutter"] })`
   (works headless on Linux; Flutter is in nixpkgs even though not exposed as
   a package-management "module").
2. Back up the customization files, then run
   `flutter create --platforms=ios,android --project-name <name> --org <org> --overwrite .`
   in the flutter project dir. **This also overwrites `lib/main.dart` and
   `pubspec.yaml`** — restore those two from git immediately after.
3. Restore/merge the project's custom `Info.plist` / `AndroidManifest.xml` back
   on top of the freshly generated scaffold (permissions, deep link scheme,
   labels — the generated ones are bare templates).
4. Recent Flutter (3.32+) generates Android as Kotlin DSL (`build.gradle.kts`,
   `settings.gradle.kts`) by default — delete any old Groovy `build.gradle` to
   avoid a duplicate/conflicting build file, and port custom config
   (applicationId, signing config) into the `.kts` syntax.
5. Fix bundle id / applicationId back to the project's real values — `flutter
   create --org` sets a generic one that won't match the App Store Connect /
   Play Console listing.
6. Regenerate real launcher icons with `flutter pub run flutter_launcher_icons`
   (the freshly created project ships placeholder Flutter icons on both
   platforms).
7. iOS builds cannot be verified in this (Linux) environment — no Xcode. `flutter
   analyze` plus a from-scratch Android debug build (if an Android SDK is
   available) is the best available smoke test; the real validation happens on
   the next Codemagic run.

**Why:** Without this scaffold, `flutter build ipa`/`flutter build appbundle`
have no real Xcode/Gradle project to compile — any app that did get published
was not built from what's in this repo, so "keeps showing a black screen after
many fix attempts" was very likely down to editing Dart code that was never
actually being shipped.

## Follow-up regression (Jul 2026): CI was still wiping the fix on every build
Even after the scaffold above was committed to git, `codemagic.yaml`'s
`ios-release` workflow still ran `flutter create --platforms=ios --org ... .`
as a build step before every build. That regenerates `AppDelegate.swift`,
`Info.plist`, and `project.pbxproj` from Flutter's bare template — silently
discarding the committed customizations (privacy usage strings, custom
`CFBundleURLTypes` deep-link scheme, `UIBackgroundModes`) on every single CI
run, with nothing downstream restoring them. Only the bundle ID got patched
back via `sed`. Root-caused by comparing against a normal, from-scratch
Flutter project (no CI regeneration step at all, just `flutter pub get` +
`flutter build`) — that comparison is what exposed the regenerate-then-forget
pattern as the bug.

**Why:** Once a real native scaffold is committed to git, CI should build it
as-is, the same way any ordinary Flutter project does. Re-running `flutter
create` "to be safe" is not idempotent with respect to customizations — it
overwrites the exact files most likely to carry required App Store config.

**How to apply:** If a Flutter iOS/Android project has a real committed native
scaffold, never call `flutter create` inside CI/codemagic scripts. If the
scaffold is later regenerated for some legitimate reason, immediately diff
`Info.plist` / `AndroidManifest.xml` / entitlements against git to confirm no
custom permissions, deep-link schemes, or background modes were dropped.
