#!/bin/bash
# Script per fare push su GitHub in un colpo solo

# Controlla se hai passato un messaggio di commit
if [ -z "$1" ]; then
  echo "Uso: ./push.sh \"messaggio di commit\""
  exit 1
fi

# Mostra lo stato
git status

# Controlla se ci sono modifiche
if git diff-index --quiet HEAD --; then
  echo "ℹ️ Nessuna modifica da commitare, push non necessario."
  exit 0
fi

# Aggiunge tutte le modifiche (inclusi file rimossi)
git add -A

# Crea il commit con il messaggio passato
git commit -m "$1"

# Fa il push sul branch corrente
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀 Push su branch: $CURRENT_BRANCH"
git push -u origin "$CURRENT_BRANCH"
