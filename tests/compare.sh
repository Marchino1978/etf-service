#!/bin/bash
# Confronto tra valori salvati in previousClose.json e prezzi correnti live su Render

BASE_URL="https://etf-service.onrender.com/api"

echo "Confronto ETF vs previousClose (Render)"

# Scarica i dati dai due endpoint
PREV=$(curl -s "$BASE_URL/previous-close")
LIVE=$(curl -s "$BASE_URL/etf")

# Cicla su tutti i simboli presenti nel live
for SYMBOL in $(echo "$LIVE" | jq -r 'keys[]'); do
  PREV_VAL=$(echo "$PREV" | jq -r --arg S "$SYMBOL" '.[$S].value // empty')
  CURR_VAL=$(echo "$LIVE" | jq -r --arg S "$SYMBOL" '.[$S].price // empty')
  DAILY=$(echo "$LIVE" | jq -r --arg S "$SYMBOL" '.[$S].dailyChange // empty')

  if [ -n "$PREV_VAL" ] && [ -n "$CURR_VAL" ]; then
    echo "$SYMBOL: previous=$PREV_VAL, current=$CURR_VAL, dailyChange=$DAILY"
  else
    echo "$SYMBOL: dati mancanti"
  fi
done
