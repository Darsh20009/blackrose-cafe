---
name: Loyalty transfer verification
description: Authorization and recipient rules for customer-to-customer loyalty point transfers.
---

Authorize customer point transfers with a one-time code sent to the sender's registered WhatsApp number, not with a password and not to the recipient's number. Bind the code to the sender, recipient, and point amount; reject transfers to the sender's own account after normalizing phone formats.

**Why:** The user reported that entering their own number could still transfer points and explicitly requested WhatsApp-code confirmation instead of a password.

**How to apply:** Preserve sender-phone verification, OTP expiry/attempt limits, context binding, and normalized self-transfer rejection in any future changes to loyalty transfers.
