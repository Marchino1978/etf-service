#!/bin/bash
# Script per riallineare e pushare su GitHub

# Vai nella cartella del progetto (relativa allo script stesso)
cd "$(dirname "$0")" || exit 1

# Determina il branch corrente
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Riallinea con il remoto (scarica anche previousClose.json aggiornato da Render)
echo "🔄 Pull dal branch remoto: $CURRENT_BRANCH"
git pull origin "$CURRENT_BRANCH" --rebase

# Assicurati che previousClose.json sia sempre aggiornato
if [ -f "./data/previousClose.json" ]; then
  echo "✅ previousClose.json sincronizzato da GitHub"
else
  echo "⚠️ previousClose.json non trovato in locale, verrà scaricato al prossimo pull"
fi

# Aggiunge tutte le modifiche (nuovi, modificati, eliminati) tranne quelli in .gitignore
git add --all

# Commit fisso "fix"
git commit -m "fix" || echo "Nessuna modifica da commitare"

# Push sul branch corrente
echo "🚀 Push su branch: $CURRENT_BRANCH"
git push origin "$CURRENT_BRANCH"
