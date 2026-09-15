def onHost(String host, String command) {
    withEnv(["APP_COMMAND=${command}", "DEPLOY_HOST=${host}"]) {
        sh '''
            set +x
            set -eu
            printf '%s\\n' "$DEVOPS_SUDO_PASSWORD" |
              ssh -i /var/jenkins_home/.ssh/id_ed25519 \
                -o BatchMode=yes -o IdentitiesOnly=yes \
                -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
                devops@"$DEPLOY_HOST" "sudo -S -p '' $APP_COMMAND"
        '''
    }
}

pipeline {
    agent any
    options { disableConcurrentBuilds() }

    environment {
        REGISTRY = '192.168.56.14:5000'
        IMAGE_NAME = 'diagnostic-app'
        APP_HOST = '192.168.56.13'
        DEVOPS_SUDO_PASSWORD = credentials('devops-sudo-password')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    if (!(env.GIT_COMMIT ==~ /[a-f0-9]{40}/)) {
                        error('Expected a full Git commit SHA')
                    }
                    env.APP_IMAGE = "${env.REGISTRY}/${env.IMAGE_NAME}:${env.GIT_COMMIT}"
                }
            }
        }
        stage('Test') {
            steps { sh 'npm test' }
        }
        stage('Build') {
            steps {
                sh 'docker build --build-arg GIT_SHA="$GIT_COMMIT" -t "$APP_IMAGE" .'
            }
        }
        stage('Security Scan') {
            steps {
                sh '''
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                      aquasec/trivy:latest image --exit-code 0 --severity HIGH,CRITICAL \
                      --ignore-unfixed "$APP_IMAGE"
                '''
            }
        }
        stage('Push') {
            steps { sh 'docker push "$APP_IMAGE"' }
        }
        stage('Pull on App VM') {
            steps {
                script { onHost(env.APP_HOST, "docker pull '${env.APP_IMAGE}'") }
            }
        }
        stage('Deploy') {
            steps {
                script { onHost(env.APP_HOST, "/opt/app/deploy.sh '${env.APP_IMAGE}'") }
            }
            post {
                failure {
                    script { onHost(env.APP_HOST, '/opt/app/rollback.sh') }
                }
            }
        }
        stage('Verify') {
            steps {
                script { onHost(env.APP_HOST, "/opt/app/verify-release.sh '${env.APP_IMAGE}'") }
            }
            post {
                failure {
                    script { onHost(env.APP_HOST, '/opt/app/rollback.sh') }
                }
            }
        }
        stage('Deploy frontends') {
            steps {
                script {
                    ['192.168.56.11', '192.168.56.12'].each { host ->
                        withEnv(["FRONTEND_HOST=${host}"]) {
                            sh '''
                                scp -i /var/jenkins_home/.ssh/id_ed25519 \
                                  -o BatchMode=yes -o IdentitiesOnly=yes \
                                  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
                                  frontend/index.html devops@"$FRONTEND_HOST":frontend-index.html
                            '''
                        }
                        onHost(host, 'install -o root -g root -m 0644 /home/devops/frontend-index.html /opt/frontend/html/index.html')
                    }
                }
            }
        }
    }
}
