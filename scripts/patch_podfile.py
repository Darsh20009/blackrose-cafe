#!/usr/bin/env python3
"""
Patch the Flutter-generated Podfile:
1. Add 'platform :ios, "13.0"' if missing
2. Inject build settings INSIDE the existing post_install block,
   wrapped in a proper target.build_configurations.each loop.
"""
import re
import sys
import os

podfile_path = os.path.join('ios', 'Podfile')

if not os.path.exists(podfile_path):
    print(f"Podfile not found at {podfile_path} — skipping patch.")
    sys.exit(0)

with open(podfile_path, 'r') as f:
    content = f.read()

# Only patch once
if '# patched-by-script' in content:
    print("Podfile already patched — skipping.")
    sys.exit(0)

# ── 1. Add platform :ios line if missing ────────────────────────────────────
if "platform :ios" not in content:
    content = "platform :ios, '13.0'\n\n" + content
    print("Added: platform :ios, '13.0'")
else:
    print("platform :ios already present — skipping.")

# ── 2. Inject build settings after flutter_additional_ios_build_settings ────
anchor = 'flutter_additional_ios_build_settings(target)'

if anchor not in content:
    print("Anchor line not found — skipping build settings injection.")
else:
    injection = """\n    # patched-by-script
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end"""
    content = content.replace(anchor, anchor + injection, 1)
    print("Injected build settings into existing post_install block.")

with open(podfile_path, 'w') as f:
    f.write(content)

print("Podfile patched successfully.")
