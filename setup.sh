#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

umask 077
mkdir -p .local
if [[ ! -f .local/credentials.json ]]; then
  python3 -c 'import json,secrets; print(json.dumps({"devops_password":secrets.token_hex(16),"password_salt":secrets.token_hex(8)}))' > .local/credentials.json
fi
if [[ ! -f .local/devops_ed25519 ]]; then
  ssh-keygen -q -t ed25519 -N '' -f .local/devops_ed25519
fi

vagrant up
ansible-galaxy collection install ansible.posix community.general
ansible-playbook -i ansible/inventory.yaml ansible/playbook.yaml

echo "Infrastructure ready. Jenkins polls main every five minutes."
echo "Open http://127.0.0.1:8080 after the pipeline completes."
