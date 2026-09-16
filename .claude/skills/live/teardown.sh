#!/usr/bin/env bash
# Harness und Server entfernen. Danach muss `git status` sauber sein.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
pkill -f "next-server" >/dev/null 2>&1
pkill -f "next dev" >/dev/null 2>&1
pkill -f "next start" >/dev/null 2>&1
rm -rf app/live-test
[ -e /tmp/pel-live-middleware.bak ] && mv /tmp/pel-live-middleware.bak middleware.ts
[ -e /tmp/pel-live-envtmp ] && rm -f .env.local && rm -f /tmp/pel-live-envtmp
rm -f /tmp/pel-live-port
echo "--- git status ---"
git status --short
