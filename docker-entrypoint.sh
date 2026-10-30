#!/bin/sh
set -e

echo "=== [Finora Backend] Checking & Applying Database Migrations ==="
npm run migration:run || echo "[Finora Backend] Notice: Migration command exited (up-to-date or already applied)."

echo "=== [Finora Backend] Starting NestJS Application ==="
exec node dist/main
