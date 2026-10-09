---
name: Apple Wallet pass validation
description: Troubleshooting passkit-generator reports that a pass type is missing.
---

`passkit-generator` 3.5.7 can catch and discard an invalid `pass.json` while importing a model, then surface the misleading error that the pass type is missing. An empty `logoText` is invalid; use a non-empty value or omit the field. Use the supported plural `barcodes` field rather than the legacy singular `barcode`.

**Why:** invalid manifest properties caused the loyalty pass type to disappear, so the final error did not identify the actual invalid fields.

**How to apply:** when `MISSING_TYPE` occurs despite a `storeCard`, `generic`, or other pass type in the manifest, validate the complete JSON against the installed package schema and inspect its earlier invalid-manifest warning before changing pass type configuration.
