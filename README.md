# Automation Alchemy

This is a small multi-VM environment with Vagrant that
configures with Ansible. Jenkins builds the diagnostic application into a
Docker image, pushes the image to a local registry, and deploys it to the app
VM over SSH.

## Tool choices and files

Vagrant manages local VirtualBox VM lifecycles; Terraform is better suited to
provider-managed infrastructure but is unnecessary for this local lab. Ansible
configures hosts over SSH without installing an agent; Puppet would add an agent
and ongoing configuration service. Jenkins gives this assignment its own CI/CD VM;
a hosted GitHub Actions runner would need access into the private VM network.

| File                      | Responsibility                                                          |
| ------------------------- | ----------------------------------------------------------------------- |
| `Vagrantfile`             | VM sizes, static addresses, hostnames, private network, local SSH ports |
| `setup.sh`                | Generate local administrator credentials, start VMs, run Ansible        |
| `ansible/inventory.yaml`  | VM connection details and generated sudo credentials                    |
| `ansible/playbook.yaml`   | Bootstrap administrator, then configure each server role                |
| `ansible/tasks/`          | Users, SSH, firewall, containers, Jenkins, registry, deployment access  |
| `ansible/verify.yaml`     | Executable mandatory infrastructure checks                              |
| `server.js`, `Dockerfile` | Backend health, metrics, and immutable release identity                 |
| `frontend/index.html`     | Metrics dashboard served by both frontend containers                    |
| `Jenkinsfile`             | Test, build, scan, push, deploy, verify, and update both frontends      |

## Architecture

| VM            | IP address      | Purpose                           |
| ------------- | --------------- | --------------------------------- |
| Load balancer | `192.168.56.10` | Nginx reverse proxy/load balancer |
| Web 1         | `192.168.56.11` | Nginx frontend container          |
| Web 2         | `192.168.56.12` | Nginx frontend container          |
| App           | `192.168.56.13` | Docker-hosted diagnostic app      |
| CI/CD         | `192.168.56.14` | Jenkins and Docker Registry       |

Jenkins uses Docker-outside-of-Docker: the Jenkins container receives the host
Docker socket and builds images with the CI/CD VM's Docker daemon.

The five static addresses belong to a VirtualBox **internal network**. They are
not exposed on a host-only or bridged adapter. The application entry point is
`http://127.0.0.1:8080`, forwarded to the load balancer. Vagrant's management SSH
ports (2222, 2200–2203) bind only to localhost; they are not public services.
UFW permits web traffic only from the load balancer, backend traffic only from
the web VMs, and registry traffic only from the app/CI VMs. Jenkins listens on
the CI VM's loopback interface. Nginx distributes requests using round robin.

## Prerequisites

- macOS or Linux
- VirtualBox
- Vagrant
- Ansible
- Python 3 and OpenSSH client
- Internet access while provisioning the VMs

## One-click setup

From the repository root:

```bash
./setup.sh
```

This starts the VMs, installs the required Ansible collections, and runs the
playbook. The process configures SSH, firewalls, Docker, Jenkins, the registry,
the application server, and Jenkins deployment access.

The initial box account bootstraps `devops` once. Ansible then allows SSH only
for `devops`. Subsequent Vagrant and Ansible runs use its generated key and sudo
password. The administrator belongs to `devops` and `sudo`, not `docker`; every
sudo invocation requires its password. Jenkins uses a masked credential for
sudo over SSH. Credentials live in the ignored `.local/` directory; keep that
directory private and retain it while these VMs exist.

To read your generated password for an interactive sudo demonstration:

```bash
python3 -c 'import json; print(json.load(open(".local/credentials.json"))["devops_password"])'
vagrant ssh app
```

Jenkins checks out **committed GitHub `main`**, not your uncommitted working
directory. Publish the updated source before the live review. Provisioning may
finish before the first polling interval/build finishes; wait for Jenkins success
and `/api/health` before opening the dashboard.

For a completely fresh run, destroy the Vagrant machines first:

```bash
vagrant destroy -f
./setup.sh
```

## Application

The application is a small Node.js HTTP server. It listens on port `3000` and
provides:

```text
GET /health → {"status":"ok"}
GET /version → deployed Git SHA
GET /metrics → CPU count/load, memory, disk space, VM uptime, Git SHA
```

Open `http://127.0.0.1:8080` for the metrics dashboard. It labels the serving
frontend (`web1` or `web2`) and application VM. Metrics describe the app VM as
reported by Node's OS API; disk space describes the container's underlying
filesystem. This is not an aggregate monitoring system for every VM.

Build it locally with:

```bash
docker build -t diagnostic-app .
docker run --rm -p 3000:3000 diagnostic-app
curl http://127.0.0.1:3000/health
```

## Jenkins pipeline

Open a local SSH tunnel to Jenkins:

```bash
vagrant ssh cicd -- -L 8081:127.0.0.1:8080 -N
```

Then open `http://127.0.0.1:8081`. The lab login is `admin` with password
`automation-alchemy-admin` (configured in `ansible/tasks/cicd.yaml`).

Ansible configures a `diagnostic-app` pipeline job from the repository's
`Jenkinsfile`. Jenkins checks the Git repository every five minutes and starts
a build when it detects a change. The pipeline performs:

1. Checkout
2. Run the application's `npm test` tests
3. Build the Docker image
4. Scan the image with Trivy for HIGH and CRITICAL vulnerabilities
5. Push to `192.168.56.14:5000`
6. SSH deployment to the app VM
7. Release and health verification
8. Update the dashboard on both frontend containers

The Trivy scan is informational: findings are shown in the build output but do
not currently block pushing or deploying the image.

Images use the full Git commit SHA as the tag:

```text
192.168.56.14:5000/diagnostic-app:<40-character-git-sha>
```

The registry is available inside the VM network at:

```text
http://192.168.56.14:5000/v2/
```

## Deployment and rollback

The app VM stores the active image in `/opt/app/release.env` and the previous
release in `/opt/app/previous-release.env`.

To deploy an image manually:

```bash
vagrant ssh app
sudo /opt/app/deploy.sh 192.168.56.14:5000/diagnostic-app:<git-sha>
```

To roll back to the previous release:

```bash
vagrant ssh app
sudo /opt/app/rollback.sh
```

Deployment verification checks that the running container uses the expected
image and that `/health` responds successfully.
