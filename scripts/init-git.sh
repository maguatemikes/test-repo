#!/usr/bin/env bash
# First-time Git initialization for the crm-web repo.
# Usage:
#   ./scripts/init-git.sh git@your-gitlab.example.com:your-group/crm-web.git
set -euo pipefail

REMOTE="${1:-}"
if [[ -z "$REMOTE" ]]; then
  echo "Usage: $0 <git-remote-url>" >&2
  exit 1
fi

git init -b main
git add .
git commit -m "Initial commit: Next.js 14 + shadcn/ui starter with Customer Hub slice"
git remote add origin "$REMOTE"
git push -u origin main

echo
echo "Pushed to $REMOTE"
echo "Next: set up CI/CD variables in GitLab → Settings → CI/CD → Variables"
