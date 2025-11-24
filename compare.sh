#!/bin/bash
# Script per eseguire compare.js con Node.js

SCRIPT="compare.js"

# Controlla che compare.js esista
if [ ! -f "$SCRIPT" ]; then
  echo "❌ File $SCRIPT non trovato nella cartella corrente."
  exit 1
fi

echo "▶ Avvio di $SCRIPT..."
node "$SCRIPT"
