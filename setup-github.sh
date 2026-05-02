#!/bin/bash

# TaxClear UK — GitHub Deploy Script
# Run this once from inside the taxclear-uk folder:
#   chmod +x setup-github.sh && ./setup-github.sh

set -e

REPO="taxclear-uk"
GITHUB_USER="gaurangjani"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   TaxClear UK — GitHub Setup Script     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check for gh CLI
if ! command -v gh &> /dev/null; then
  echo "📦 Installing GitHub CLI..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install gh
  else
    echo "Please install GitHub CLI from: https://cli.github.com"
    exit 1
  fi
fi

# Authenticate if needed
if ! gh auth status &> /dev/null; then
  echo "🔑 Logging in to GitHub..."
  gh auth login
fi

echo "📁 Initialising git..."
git init
git add .
git commit -m "🚀 Initial commit — TaxClear UK v1.0.0"

echo "🐙 Creating GitHub repository: ${GITHUB_USER}/${REPO}..."
gh repo create "${REPO}" \
  --public \
  --description "Open-source UK tax manager — Income Tax, NI, VAT, Pension, CGT & more (2024/25)" \
  --push \
  --source=. \
  --remote=origin

echo ""
echo "⚙️  Enabling GitHub Pages..."
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/${GITHUB_USER}/${REPO}/pages" \
  -f source='{"branch":"main","path":"/"}' \
  -f build_type='workflow' 2>/dev/null || true

echo ""
echo "✅ Done! GitHub Actions is now building your site."
echo ""
echo "   🔗 Repo:  https://github.com/${GITHUB_USER}/${REPO}"
echo "   🌍 Live:  https://${GITHUB_USER}.github.io/${REPO}/"
echo "   ⚡ CI/CD: https://github.com/${GITHUB_USER}/${REPO}/actions"
echo ""
echo "The live URL will be active in ~2 minutes once the Action finishes."
echo ""
