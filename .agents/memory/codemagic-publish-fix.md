---
name: Codemagic App Store publish fix
description: What caused "Publishing failed" and how it was fixed
---

## Root causes
1. **Missing `aps-environment` entitlement** — App Store Connect rejects IPAs that declare push notifications in the provisioning profile but don't have the `aps-environment: production` entitlement in the binary
2. **No explicit export method** — `xcode-project build-ipa` without `--export-xcargs method=app-store` can default to `development` export which App Store Connect refuses
3. **Entitlements file not registered in pbxproj** — Xcode won't embed entitlements unless `CODE_SIGN_ENTITLEMENTS` is set in the build settings

## Fix applied in codemagic.yaml
- Added step "Create App Entitlements" that writes `ios/App/App/App.entitlements` with `aps-environment: production` and `com.apple.developer.associated-domains`
- Registers entitlements via `perl -i -pe` patch on `project.pbxproj`
- Added `--export-xcargs "method=app-store teamID=$APPLE_TEAM_ID"` to build-ipa command
- Added `submit_to_app_store: false` to only upload to TestFlight, not submit for review automatically

## Requirements still needed in Codemagic UI
- The `blackrose_appstore` integration must have a valid App Store Connect API key configured (Team → Integrations → App Store Connect)
- App must exist in App Store Connect under bundle ID `blackrose.com.sa`

**Why:** The entitlement mismatch causes altool/notarytool to reject the upload with a generic "Publishing failed" message even when the IPA itself built successfully.
