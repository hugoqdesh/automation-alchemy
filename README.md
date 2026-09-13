# Automation Alchemy

This is a small multi-VM environment with Vagrant that
configures with Ansible. Jenkins builds the diagnostic application into a
Docker image, pushes the image to a local registry, and deploys it to the app
VM over SSH.

## Architecture

| VM            | IP address      | Purpose                           |
| ------------- | --------------- | --------------------------------- |
| Load balancer | `192.168.56.10` | Nginx reverse proxy/load balancer |
| Web 1         | `192.168.56.11` | Nginx web server                  |
| Web 2         | `192.168.56.12` | Nginx web server                  |
| App           | `192.168.56.13` | Docker-hosted diagnostic app      |
| CI/CD         | `192.168.56.14` | Jenkins and Docker Registry       |

Jenkins uses Docker-outside-of-Docker: the Jenkins container receives the host
Docker socket and builds images with the CI/CD VM's Docker daemon.

## Prerequisites

- macOS or Linux
- VirtualBox
- Vagrant
- Ansible
- Internet access while provisioning the VMs

## One-click setup

From the repository root:

```bash
./setup.sh
```

This starts the VMs, installs the required Ansible collections, and runs the
playbook. The process configures SSH, firewalls, Docker, Jenkins, the registry,
the application server, and Jenkins deployment access.

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
```

Build it locally with:

```bash
docker build -t diagnostic-app .
docker run --rm -p 3000:3000 diagnostic-app
curl http://127.0.0.1:3000/health
```

## Jenkins pipeline

Jenkins is available at:

```text
http://192.168.56.14:8080
```

Ansible configures a `diagnostic-app` pipeline job from the repository's
`Jenkinsfile`. The pipeline performs:

1. Checkout
2. Docker image build
3. Push to `192.168.56.14:5000`
4. SSH deployment to the app VM
5. Release and health verification

Images use the full Git commit SHA as the tag:

```text
192.168.56.14:5000/diagnostic-app:<40-character-git-sha>
```

The registry is available at:

```text
http://192.168.56.14:5000/v2/
```

## Deployment and rollback

The app VM stores the active image in `/opt/app/release.env` and the previous
release in `/opt/app/previous-release.env`.

To deploy an image manually:

```bash
ssh deploy@192.168.56.13
/opt/app/deploy.sh 192.168.56.14:5000/diagnostic-app:<git-sha>
```

To roll back to the previous release:

```bash
ssh deploy@192.168.56.13
/opt/app/rollback.sh
```

Deployment verification checks that the running container uses the expected
image and that `/health` responds successfully.
