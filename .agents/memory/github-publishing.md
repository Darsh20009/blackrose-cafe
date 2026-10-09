---
name: GitHub publishing expectation
description: The user's repeated requests to upload completed project changes to GitHub.
---

When the user asks to upload project updates to GitHub, push the completed changes to the repository's configured GitHub remote after verifying the branch and working tree.

**Why:** the user has repeatedly requested that updates be uploaded to GitHub.

**How to apply:** check the current branch, remotes, and pending commits first. Use the GitHub integration or the secure secrets flow for authentication; never expose credentials. Confirm the remote branch after pushing.
