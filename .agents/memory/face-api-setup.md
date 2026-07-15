---
name: face-api.js Setup for Attendance Kiosk
description: How face recognition is configured in the attendance kiosk — packages, model serving, import path.
---

# Face Recognition Setup

**Package**: `@vladmandic/face-api` (installed as dev dep; also `face-api.js` installed but not used)

**Model serving**: Model files from `node_modules/@vladmandic/face-api/model/` are copied to `public/face-models/` and served as static assets.
- Run: `cp node_modules/@vladmandic/face-api/model/* public/face-models/`
- MODEL_URL in `client/src/lib/face-recognition.ts` is `/face-models`

**Why local serving**: CDN for face-api.js@0.22.2 weights returns 404 on jsDelivr. vladmandic CDN also had issues in Replit's proxied preview. Local static serving is reliable.

**Import in face-recognition.ts**: `import("@vladmandic/face-api")` (dynamic import to avoid SSR)

**Model files needed** (all in public/face-models/):
- ssd_mobilenetv1_model.bin + manifest
- face_landmark_68_model.bin + manifest
- face_recognition_model.bin + manifest
- face_landmark_68_tiny_model.bin + manifest (for TinyFaceDetector)

**How to apply**: If face models stop working or are missing, re-run the copy command above. If updating @vladmandic/face-api version, re-copy models.
