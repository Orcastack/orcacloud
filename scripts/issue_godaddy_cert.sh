#!/usr/bin/env bash
set -euo pipefail

# Issue Let's Encrypt certs via acme.sh using GoDaddy DNS-01 and push TLS secret to Kubernetes
# Usage:
# 1) Install acme.sh if you don't have it: curl https://get.acme.sh | sh
# 2) Export GD_Key and GD_Secret env vars, or pass them inline.
#    export GD_Key="<GODADDY_API_KEY>"; export GD_Secret="<GODADDY_API_SECRET>"
# 3) Run this script:
#    ./scripts/issue_godaddy_cert.sh --domains "orcacloud.com,www.orcacloud.com,api.orcacloud.com" --namespace default --secret orcacloud-com-tls --staging

# This script will:
#  - call acme.sh to perform DNS-01 issuance against GoDaddy
#  - create or update a kubernetes TLS secret with the resulting cert
#  - set a deploy hook so future renewals automatically update the secret

DOMAINS=""
NAMESPACE="default"
SECRET_NAME="orcacloud-com-tls"
STAGING=false
ACME_HOME="${HOME}/.acme.sh"

usage(){
  cat <<EOF
Usage: $0 --domains "example.com,www.example.com" [--namespace default] [--secret name] [--staging]

Environment variables:
  GD_Key      GoDaddy API key
  GD_Secret   GoDaddy API secret

Examples:
  GD_Key=xxx GD_Secret=yyy $0 --domains "orcacloud.com,www.orcacloud.com,api.orcacloud.com" --staging
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domains) DOMAINS="$2"; shift 2;;
    --namespace) NAMESPACE="$2"; shift 2;;
    --secret) SECRET_NAME="$2"; shift 2;;
    --staging) STAGING=true; shift 1;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

if [[ -z "$DOMAINS" ]]; then
  echo "Missing --domains" >&2
  usage
fi

if [[ -z "${GD_Key:-}" || -z "${GD_Secret:-}" ]]; then
  echo "Please set GD_Key and GD_Secret environment variables (GoDaddy API key and secret)" >&2
  exit 2
fi

# Ensure acme.sh is installed
if ! command -v acme.sh >/dev/null 2>&1; then
  echo "acme.sh not found, installing..."
  curl https://get.acme.sh | sh
  export PATH="$HOME/.acme.sh:$PATH"
fi

# Prepare acme server
if [ "$STAGING" = true ]; then
  ACME_SERVER="https://acme-staging-v02.api.letsencrypt.org/directory"
else
  ACME_SERVER="https://acme-v02.api.letsencrypt.org/directory"
fi

# Build acme.sh domains arguments
IFS=',' read -r -a domain_array <<< "$DOMAINS"
acme_args=()
for d in "${domain_array[@]}"; do
  acme_args+=("-d" "$d")
done

# Export GoDaddy credentials for acme.sh dns_gd
export GD_Key
export GD_Secret

echo "Issuing certificate for: $DOMAINS"
acme_cmd=(acme.sh --issue --dns dns_gd "${acme_args[@]}" --server "$ACME_SERVER")

# Run issue
"${acme_cmd[@]}"

# Determine cert path
# acme.sh stores certificates under $ACME_HOME/<domain>/<domain>.cer
PRIMARY_DOMAIN="${domain_array[0]}"
CERT_DIR="$ACME_HOME/$PRIMARY_DOMAIN"
CERT_PEM="$CERT_DIR/fullchain.cer"
KEY_PEM="$CERT_DIR/${PRIMARY_DOMAIN}.key"

if [[ ! -f "$CERT_PEM" || ! -f "$KEY_PEM" ]]; then
  # Some acme.sh versions use different filenames; try alternatives
  CERT_PEM_ALT="$CERT_DIR/${PRIMARY_DOMAIN}.cer"
  KEY_PEM_ALT="$CERT_DIR/${PRIMARY_DOMAIN}.key"
  if [[ -f "$CERT_PEM_ALT" && -f "$KEY_PEM_ALT" ]]; then
    CERT_PEM="$CERT_PEM_ALT"
    KEY_PEM="$KEY_PEM_ALT"
  else
    echo "Certificate files not found in $CERT_DIR" >&2
    ls -la "$CERT_DIR" || true
    exit 3
  fi
fi

echo "Creating/updating Kubernetes TLS secret ${SECRET_NAME} in namespace ${NAMESPACE}"
# Use dry-run + apply for idempotency
kubectl create secret tls "$SECRET_NAME" \
  --cert="$CERT_PEM" --key="$KEY_PEM" -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Install renew hook so future renewals update the secret automatically
RELOAD_CMD="kubectl create secret tls ${SECRET_NAME} --cert=\'$CERT_PEM\' --key=\'$KEY_PEM\' -n ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -"

# Register reload command with acme.sh for this certificate
# acme.sh supports --reloadcmd during install-cert; using --install-cert to set up deploy hook
acme.sh --install-cert -d "$PRIMARY_DOMAIN" \
  --key-file "$KEY_PEM" --fullchain-file "$CERT_PEM" \
  --reloadcmd "$RELOAD_CMD" || true

cat <<EOF
Done.
Certificate for: $DOMAINS
Kubernetes secret: ${NAMESPACE}/${SECRET_NAME}
If you used --staging, switch to production by re-running this script without --staging after verifying staging certs.
To view certificate status in Kubernetes:
  kubectl get secret ${SECRET_NAME} -n ${NAMESPACE} -o yaml

Note: acme.sh will automatically renew and run the reload command to update the k8s secret.
EOF
