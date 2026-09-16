#!/usr/bin/env bash
# Harness einsetzen, Produktionsbuild bauen, Server starten.
# Siehe .claude/skills/live/SKILL.md. Rückgängig mit teardown.sh.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
S=.claude/skills/live
# 3000 ist in dieser Umgebung unbrauchbar (leere 200er, siehe SKILL.md)
PORT="${PEL_LIVE_PORT:-3333}"

if [ -e app/live-test ]; then echo "app/live-test existiert schon — erst teardown.sh"; exit 1; fi
mkdir -p app/live-test
cp "$S/harness/page.tsx" "$S/harness/fixture.ts" app/live-test/

# Supabase-Platzhalter: createClient() wirft ohne diese Variablen beim Rendern.
# Die URL wird nie erreichbar sein, das ist gewollt — nur der Realtime-Socket
# läuft dagegen ins Leere.
if [ ! -e .env.local ]; then
  printf 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:1\nNEXT_PUBLIC_SUPABASE_ANON_KEY=live-test-anon-key\n' > .env.local
  echo .env.local > /tmp/pel-live-envtmp
fi

# Die Route aus der Auth-Middleware nehmen
cp middleware.ts /tmp/pel-live-middleware.bak
perl -pi -e 's{api/time\|}{api/time|live-test|}' middleware.ts
grep -q 'live-test' middleware.ts || { echo "Middleware-Matcher nicht getroffen"; exit 1; }

# Playwright ohne package.json anzufassen: --no-save landet nur in
# node_modules, und das ist ohnehin ignoriert.
node -e "require.resolve('playwright')" >/dev/null 2>&1 \
  || npm i --no-save playwright >/tmp/pel-live-npm.log 2>&1 \
  || { echo "playwright liess sich nicht installieren:"; tail -10 /tmp/pel-live-npm.log; exit 1; }

npm run build >/tmp/pel-live-build.log 2>&1 || { tail -30 /tmp/pel-live-build.log; exit 1; }
# next start taucht als "next-server" auf, next dev zusätzlich als eigener
# Prozess — beide müssen weg, sonst hält ein alter Build den Port und man
# prüft ahnungslos den Stand von vorhin.
pkill -f "next-server" >/dev/null 2>&1 || true
pkill -f "next dev"   >/dev/null 2>&1 || true
pkill -f "next start" >/dev/null 2>&1 || true
sleep 2
nohup npx next start -p "$PORT" >/tmp/pel-live-server.log 2>&1 &
echo "$PORT" > /tmp/pel-live-port

# `grep -q … && break` wäre hier der letzte Befehl im Schleifenrumpf: Schlägt
# das grep beim ersten Durchlauf fehl, bricht `set -e` das ganze Skript ab,
# statt weiter zu warten.
bereit=0
for _ in $(seq 1 40); do
  if grep -q "Ready in" /tmp/pel-live-server.log; then bereit=1; break; fi
  sleep 1
done
if [ "$bereit" != 1 ]; then
  echo "Server kam nicht hoch:"; tail -20 /tmp/pel-live-server.log; exit 1
fi
echo "läuft: http://127.0.0.1:$PORT/live-test?hy=8"
echo "        …?hy=19&hold=1   für die Tail-End-Vorschau"
echo "danach: bash .claude/skills/live/teardown.sh"
