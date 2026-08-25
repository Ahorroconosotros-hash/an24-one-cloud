#!/bin/zsh
set -e

BRANCH=$(git branch --show-current)

echo "☁️ ONE · Preparando subida a cloud..."
git add -A

if ! git diff --cached --quiet; then
  git commit -m "ONE cloud sync $(date '+%Y-%m-%d %H:%M')"
else
  echo "✓ No hay cambios nuevos para guardar."
fi

echo "⬆️ Enviando a GitHub · rama $BRANCH..."
git push origin "$BRANCH"

echo ""
echo "✅ GitHub actualizado."
echo "🚀 Vercel debe iniciar el deployment automáticamente."
