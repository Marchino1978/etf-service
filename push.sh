#!/bin/bash
# Script per fare push su GitHub in un colpo solo

# Controlla se hai passato un messaggio di commit
if [ -z "$1" ]; then
  echo "Uso: ./push.sh \"messaggio di commit\""
  exit 1
fi

# Mostra lo stato
git status

# Aggiunge tutte le modifiche
git add .

# Crea il commit con il messaggio passato
git commit -m "$1"

# Fa il push su main
git push -u origin main1
