"""
Patch ios/Podfile to fix non-modular Firebase header errors in Xcode.

Root cause: Flutter's Firebase wrapper pods (lowercase: firebase_auth,
firebase_core, firebase_messaging, …) include Firebase.h from the Firebase
SDK inside their own framework modules. Xcode rejects this as a
"non-modular header inside framework module" error.

Fix:
  1. CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES  (all targets)
  2. OTHER_CFLAGS += -Wno-non-modular-include-in-framework-module (all targets)
  3. DEFINES_MODULE = NO — ONLY for lowercase flutter wrapper pods
     (firebase_auth, firebase_core, firebase_messaging, …) so Xcode no longer
     enforces the modular-header constraint on them.
     CamelCase SDK pods (FirebaseCore, FirebaseMessaging, …) are left untouched
     so @import FirebaseCore still resolves correctly.

The script is idempotent — re-running it is safe.
"""

import sys

PODFILE_PATH = "ios/Podfile"
MARKER = "# --- blackrose-patch-applied ---"

# Standalone block appended when Flutter's anchor line is absent
PATCH_RUBY = """
# --- blackrose-patch-applied ---
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      flags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
      unless flags.include?('-Wno-non-modular-include-in-framework-module')
        config.build_settings['OTHER_CFLAGS'] = "#{flags} -Wno-non-modular-include-in-framework-module"
      end
      # Only disable DEFINES_MODULE for lowercase Flutter wrapper pods
      # (firebase_auth, firebase_core, firebase_messaging, …).
      # CamelCase Firebase SDK pods (FirebaseCore, FirebaseMessaging, …)
      # must remain as proper modules so @import still works.
      if target.name.match?(/^firebase_[a-z_]+$/)
        config.build_settings['DEFINES_MODULE'] = 'NO'
      end
    end
  end
end
"""

# Inline injection appended after flutter_additional_ios_build_settings(target)
INJECTION = (
    "\n    target.build_configurations.each do |config|\n"
    "      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n"
    "      flags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'\n"
    "      unless flags.include?('-Wno-non-modular-include-in-framework-module')\n"
    "        config.build_settings['OTHER_CFLAGS'] = \"#{flags} -Wno-non-modular-include-in-framework-module\"\n"
    "      end\n"
    "      if target.name.match?(/^firebase_[a-z_]+$/)\n"
    "        config.build_settings['DEFINES_MODULE'] = 'NO'\n"
    "      end\n"
    "    end"
)

ANCHOR = "flutter_additional_ios_build_settings(target)"

with open(PODFILE_PATH, "r") as fh:
    content = fh.read()

if MARKER in content:
    print("Podfile already patched — skipping.")
    sys.exit(0)

if ANCHOR in content:
    patched = content.replace(ANCHOR, ANCHOR + INJECTION, 1)
    print("Injected build settings inside existing flutter post_install block.")
else:
    patched = content + PATCH_RUBY
    print("No flutter_additional_ios_build_settings found — appended standalone post_install block.")

with open(PODFILE_PATH, "w") as fh:
    fh.write(patched)

print("Podfile patched successfully.")
