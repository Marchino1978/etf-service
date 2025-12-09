#!/bin/bash
# Script veloce per push su GitHub
# Usa sempre "fix" come messaggio di commit

# Aggiunge tutte le modifiche (nuovi, modificati, eliminati)
git add --all

# Crea il commit con messaggio fisso
git commit -m "fix"

# Determina il branch corrente
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Fa il push sul branch corrente
echo "🚀 Push su branch: $CURRENT_BRANCH"
git push origin "$CURRENT_BRANCH"