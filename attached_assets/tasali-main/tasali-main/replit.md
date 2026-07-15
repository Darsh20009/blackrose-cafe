# Tasali Qurumsh — Café Management System

## Overview
Full-stack café/restaurant management platform (QIROX CAFE Engine). Built with React + Express + MongoDB + TypeScript.

- **Frontend**: React 18, Vite, Tailwind CSS, Radix UI, i18next (Arabic/English)
- **Backend**: Express.js, Mongoose/MongoDB, Passport.js auth, WebSocket
- **Language**: TypeScript (strict mode)

## How to run
```
npm run dev
```
Starts the Express server (port 5000) which also serves the Vite dev frontend.

## Required secrets
| Secret | Description |
|--------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `SESSION_SECRET` | Express session secret |

## Optional secrets (features disabled if absent)
| Secret | Description |
|--------|-------------|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push notifications |
| `PAYMOB_*` | PayMob payment gateway |
| `GOOGLE_*` | Google Sheets / OAuth |

## Project status
- **Phases 0–4** complete: architecture, recipe engine, inventory engine, accounting engine, 14 REST API routes
- **Phase 5** pending: Dashboard UI pages (recipe management, inventory dashboard, accounting dashboard, reports, stock movements log)
- **Phase 6** pending: CSV/PDF exports
- **Phase 7** pending: Tests

## Key directories
```
server/          — Express backend, engines, routes
client/src/      — React frontend pages and components
shared/          — Shared TypeScript types and Zod schemas
public/          — Static assets
Documentation/   — Architecture, API specs, domain models
```

## User preferences
- Keep existing project structure and stack
