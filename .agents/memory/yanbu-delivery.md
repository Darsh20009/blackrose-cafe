---
name: Yanbu delivery area
description: Product and customer-flow constraints for online delivery in the Black Rose app.
---

Online delivery is limited to Yanbu, Saudi Arabia. Customers choose a map location and provide street/building details; delivery costs 25 SAR within 30 km of the Al-Murooj branch and is unavailable beyond that range. The customer flow should not ask them to choose a country or administrative region.

**Why:** the user stated that the business delivers only in Yanbu and asked to remove the country selector.

**How to apply:** Keep Yanbu/Saudi Arabia fixed in the address record and UI, and enforce delivery eligibility through the Al-Murooj distance check rather than country or region dropdowns.
