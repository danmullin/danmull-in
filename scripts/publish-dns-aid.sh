#!/usr/bin/env bash
# Publish DNS-AID HTTPS records for danmull.in via the Cloudflare API.
# Needs a token with Zone.DNS Edit (and Zone.DNSSEC Write if you pass --enable-dnssec).
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-danmull.in}"
API="https://api.cloudflare.com/client/v4"
TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"
ENABLE_DNSSEC=0

usage() {
  cat <<'EOF'
Publish DNS-AID records (RFC 9460 HTTPS) for danmull.in.

  CLOUDFLARE_API_TOKEN=... ./scripts/publish-dns-aid.sh [--enable-dnssec]

Creates/updates:
  _index._agents.danmull.in  HTTPS 1 danmull.in. alpn="h2" port=443
  _mcp._agents.danmull.in    HTTPS 1 danmull.in. alpn="h2" port=443
  _a2a._agents.danmull.in    HTTPS 1 danmull.in. alpn="h2" port=443
EOF
}

for arg in "$@"; do
  case "$arg" in
    --enable-dnssec) ENABLE_DNSSEC=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$TOKEN" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN (Zone.DNS Edit)." >&2
  exit 1
fi

cf() {
  local method=$1
  local path=$2
  shift 2
  curl -sS -X "$method" "$API$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$@"
}

json_ok() {
  python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("success") else 1)'
}

ZONE_ID="$(cf GET "/zones?name=${ZONE_NAME}" | python3 -c '
import json,sys
d=json.load(sys.stdin)
if not d.get("success") or not d.get("result"):
    raise SystemExit("could not resolve zone id for '"${ZONE_NAME}"'")
print(d["result"][0]["id"])
')"

upsert_https() {
  local name=$1
  local comment=$2
  local payload
  payload="$(python3 -c "
import json
print(json.dumps({
  'type': 'HTTPS',
  'name': '$name',
  'ttl': 3600,
  'comment': '$comment',
  'data': {
    'priority': 1,
    'target': '$ZONE_NAME',
    'value': 'alpn=\"h2\" port=443',
  },
}))
")"

  local existing
  existing="$(cf GET "/zones/${ZONE_ID}/dns_records?type=HTTPS&name=${name}.${ZONE_NAME}")"
  local rec_id
  rec_id="$(printf '%s' "$existing" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print(d["result"][0]["id"] if d.get("result") else "")
')"

  local response
  if [[ -n "$rec_id" ]]; then
    response="$(cf PUT "/zones/${ZONE_ID}/dns_records/${rec_id}" --data "$payload")"
  else
    response="$(cf POST "/zones/${ZONE_ID}/dns_records" --data "$payload")"
  fi
  printf '%s' "$response" | python3 -c '
import json,sys
d=json.load(sys.stdin)
if not d.get("success"):
    raise SystemExit("Cloudflare API error: " + json.dumps(d.get("errors"), indent=2))
r=d["result"]
print(f"ok {r[\"type\"]} {r[\"name\"]} {r.get(\"content\") or r.get(\"data\")}")
'
}

upsert_https "_index._agents" "DNS-AID well-known index"
upsert_https "_mcp._agents" "DNS-AID MCP entrypoint"
upsert_https "_a2a._agents" "DNS-AID A2A entrypoint"

if [[ "$ENABLE_DNSSEC" -eq 1 ]]; then
  cf PATCH "/zones/${ZONE_ID}/dnssec" --data '{"status":"active"}' | python3 -c '
import json,sys
d=json.load(sys.stdin)
if not d.get("success"):
    raise SystemExit("DNSSEC enable failed: " + json.dumps(d.get("errors"), indent=2))
r=d["result"]
print("DNSSEC status:", r.get("status"))
print("DS record (add at registrar if Cloudflare is not the registrar parent):")
print(r.get("ds") or "(none returned)")
'
fi

echo
echo "Verify:"
echo "  curl -sS -H 'Accept: application/dns-json' \\"
echo "    'https://cloudflare-dns.com/dns-query?name=_index._agents.${ZONE_NAME}&type=HTTPS'"
