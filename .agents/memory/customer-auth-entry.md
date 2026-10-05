---
name: Customer auth entry
description: Where customer login and registration open in the storefront.
---

From the customer storefront home page or menu, account access opens a modal without navigating away. WhatsApp OTP is the default; existing customers sign in after verifying, while new customers provide a name and optional email after verification. Phone-and-password login is secondary. Keep employee authentication separate.

**Why:** the user explicitly asked to sign in or create an account from the home page or menu without leaving that page.

**How to apply:** Route unauthenticated account controls through the shared auth-modal context, defer new-customer details until OTP verification, and keep staff login navigation separate.