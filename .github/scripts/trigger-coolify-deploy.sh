#!/usr/bin/env bash
set -euo pipefail

webhook="${1:?deploy webhook URL required}"

if [ -z "${COOLIFY_TOKEN:-}" ]; then
  echo "Missing COOLIFY_TOKEN secret"
  exit 1
fi

if ! [[ "$webhook" == *"/api/v1/deploy"* ]]; then
  echo "Wrong webhook URL."
  echo "Copy Deploy webhook from Coolify: Configuration → Webhooks (not Manual Git webhooks)."
  echo "Expected: https://<coolify-host>/api/v1/deploy?uuid=<app-uuid>&force=false"
  exit 1
fi

auth=(-H "Authorization: Bearer ${COOLIFY_TOKEN}" -H "Accept: application/json")

try_request() {
  local method="$1"
  shift
  echo "→ ${method} $*"
  local code
  code="$(curl -sS -o /tmp/coolify-deploy-response.txt -w '%{http_code}' -X "$method" "$@" "${auth[@]}")"
  echo "HTTP ${code}"
  head -c 800 /tmp/coolify-deploy-response.txt 2>/dev/null || true
  echo
  case "$code" in
    200 | 201 | 202) return 0 ;;
    *) return 1 ;;
  esac
}

if try_request GET "$webhook"; then exit 0; fi
if try_request POST "$webhook"; then exit 0; fi

base="${webhook%%\?*}"
uuid="$(printf '%s' "$webhook" | sed -n 's/.*[?&]uuid=\([^&]*\).*/\1/p')"
if [ -n "$uuid" ]; then
  if try_request POST "$base" \
    -H "Content-Type: application/json" \
    -d "{\"uuid\":\"${uuid}\",\"force\":false}"; then
    exit 0
  fi
fi

echo "Coolify deploy trigger failed (often wrong webhook URL or token permissions)."
exit 1
