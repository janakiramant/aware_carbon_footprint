#!/usr/bin/env bash
# setup-hooks.sh
# ─────────────────────────────────────────────────────────────────────────────
# One-time bootstrap script for new contributors.
# Points git's hook path to .githooks/ (tracked by the repo) so pre-commit
# and pre-push gates are automatically available on every fresh clone.
#
# Run once after cloning:
#   bash setup-hooks.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "🔧 Configuring git hooks path to .githooks/ ..."
git config core.hooksPath .githooks

echo "🔑 Making hooks executable ..."
chmod +x .githooks/pre-commit
chmod +x .githooks/pre-push

echo "📦 Installing dependencies ..."
npm install

echo ""
echo "✅ Done! Git security gates are now active:"
echo "   pre-commit : ESLint (staged files, --max-warnings=0)"
echo "   pre-push   : Vitest full suite (main/master only)"
