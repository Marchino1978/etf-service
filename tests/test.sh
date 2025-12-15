#!/bin/bash
export NODE_ENV=test

ROOT_DIR="$(dirname "$(pwd)")"
SERVER_JS="$ROOT_DIR/core/server.js"
PORT=${PORT:-3000}

echo "▶️ ROOT_DIR: $ROOT_DIR"
echo "▶️ SERVER_JS: $SERVER_JS"
echo "▶️ PORT: $PORT"

# Avvia il server in background e salva il PID
node "$SERVER_JS" &
SERVER_PID=$!

# Attendi qualche secondo per permettere al server di avviarsi
sleep 3

# Test su tutti gli ETF
for SYMBOL in VUAA VNGA80 GOLD XEON VWCE SWDA XUSE EXUS; do
  echo "🔎 Test $SYMBOL"
  curl -s "http://localhost:$PORT/api/etf/$SYMBOL" | jq .
done

echo "✅ Test completato"

# Termina il server per evitare log accavallati
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
