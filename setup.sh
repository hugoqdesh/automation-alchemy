#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

vagrant up
ansible-galaxy collection install ansible.posix community.general
ansible-playbook -i ansible/inventory.yaml ansible/playbook.yaml

echo "Infrastructure and Jenkins are ready."
