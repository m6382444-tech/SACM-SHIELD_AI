#!/usr/bin/env bash
# ScamShield AI - Push Fix to GitHub Script
set -e

REPO_DIR="/home/megha/.gemini/antigravity/scratch/SACM-SHIELD_AI"
cd "$REPO_DIR"

echo "================================================================="
echo "🛡️  ScamShield AI — Pushing Fix to GitHub (SACM-SHIELD_AI)"
echo "================================================================="
echo ""

if [ -n "$1" ]; then
  GITHUB_TOKEN="$1"
  git remote set-url origin "https://m6382444-tech:${GITHUB_TOKEN}@github.com/m6382444-tech/SACM-SHIELD_AI.git"
  git push origin main
  git remote set-url origin "https://github.com/m6382444-tech/SACM-SHIELD_AI.git"
  echo ""
  echo "✅ Successfully pushed to GitHub!"
else
  echo "Pushing with git credentials..."
  echo "(If prompted, enter your GitHub Username and Personal Access Token)"
  git push origin main
fi

echo ""
echo "================================================================="
echo "🎉 Changes are live! GitHub Pages will update in ~60 seconds at:"
echo "👉 https://m6382444-tech.github.io/SACM-SHIELD_AI/"
echo "================================================================="
