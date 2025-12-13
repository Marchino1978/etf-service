#!/bin/bash
# Script per riallineare e pushare su GitHub

# Vai nella cartella del progetto (relativa allo script stesso)
cd "$(dirname "$0")" || exit 1

# Configura identità Git locale (serve su Render o ambienti puliti)
git config user.name "Marco"
git config user.email "marco@example.com"

# Determina il branch corrente
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Riallinea con il remoto (scarica anche previousClose.json aggiornato da Render)
echo "🔄 Pull dal branch remoto: $CURRENT_BRANCH"
# Se ci sono modifiche non committate, le stashiamo per evitare errori
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️ Modifiche locali trovate, le salvo temporaneamente con git stash"
  git stash --include-untracked
  STASHED=true
fi

git pull origin "$CURRENT_BRANCH" --rebase

# Se avevamo fatto stash, ripristiniamo
if [ "$STASHED" = true ]; then
  echo "🔄 Ripristino modifiche locali dallo stash"
  git stash pop || echo "⚠️ Nessuna modifica da ripristinare"
fi

# Assicurati che previousClose.json sia sempre aggiornato
if [ -f "./data/previousClose.json" ]; then
  echo "✅ previousClose.json sincronizzato da GitHub"
else
  echo "⚠️ previousClose.json non trovato in locale, verrà scaricato al prossimo pull"
fi

# Aggiunge tutte le modifiche (nuovi, modificati, eliminati) tranne quelli in .gitignore
git add --all

# Commit fisso "fix"
git commit -m "fix" || echo "ℹ️ Nessuna modifica da commitare"

# Push sul branch corrente
echo "🚀 Push su branch: $CURRENT_BRANCH"
git push origin "$CURRENT_BRANCH"
