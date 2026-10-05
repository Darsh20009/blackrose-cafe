---
name: Customer auth entry
description: Where customer login and registration open in the storefront.
---

From the customer storefront home page or menu, opening account access should show a modal with sign-in and account-creation options rather than navigating away. Keep employee authentication separate.

**Why:** the user explicitly asked to sign in or create an account from the home page or menu without leaving that page.

**How to apply:** Route unauthenticated account controls on those storefront pages through the shared auth-modal context; do not change staff login navigation.