#!/bin/bash
set -e

# Install any new dependencies added by merged tasks
# This project uses MongoDB — no schema migrations (db:push) needed
npm install --prefer-offline 2>&1 | tail -5

echo "✅ Post-merge setup complete"
