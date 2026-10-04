---
name: Employee OTP eligibility
description: Eligibility and user-facing messages for phone OTP on the employee portal.
---

Only an active employee account may receive a staff-portal OTP. If the entered phone belongs only to a customer, clearly say it is a customer number without employee access and do not send a code. Unknown employee numbers and inactive employee accounts should receive their own clear messages.

**Why:** the user explicitly asked for customer-only phone numbers to be identified as unauthorized in the employee portal rather than silently appearing to send a code.

**How to apply:** Keep the eligibility check on the server before generating or sending an OTP, and surface the returned error in the employee login UI.