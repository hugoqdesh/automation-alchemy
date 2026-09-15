pipeline {
    agent any

    environment {
        REGISTRY = '192.168.56.14:5000'
        IMAGE_NAME = 'diagnostic-app'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh '''
                    set -eu
                    docker build \
                      -t "$REGISTRY/$IMAGE_NAME:$GIT_COMMIT" \
                      .
                '''
            }
        }

        stage('Security Scan') {
            steps {
                sh '''
                    set -eu
                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      aquasec/trivy:latest \
                      image --exit-code 0 --severity HIGH,CRITICAL --ignore-unfixed \
                      "$REGISTRY/$IMAGE_NAME:$GIT_COMMIT"
                '''
            }
        }

        stage('Push') {
            steps {
                sh '''
                    set -eu
                    docker push "$REGISTRY/$IMAGE_NAME:$GIT_COMMIT"
                '''
            }
        }

        stage('Pull on App VM') {
            steps {
                sh '''
                    set -eu
                    image="$REGISTRY/$IMAGE_NAME:$GIT_COMMIT"
                    ssh -i /var/jenkins_home/.ssh/id_ed25519 \
                      -o BatchMode=yes \
                      -o IdentitiesOnly=yes \
                      -o StrictHostKeyChecking=no \
                      -o UserKnownHostsFile=/dev/null \
                      deploy@192.168.56.13 \
                      "docker pull '$image'"
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -eu
                    image="$REGISTRY/$IMAGE_NAME:$GIT_COMMIT"
                    ssh -i /var/jenkins_home/.ssh/id_ed25519 \
                      -o BatchMode=yes \
                      -o IdentitiesOnly=yes \
                      -o StrictHostKeyChecking=no \
                      -o UserKnownHostsFile=/dev/null \
                      deploy@192.168.56.13 \
                      "/opt/app/deploy.sh '$image'"
                '''
            }
            post {
                failure {
                    sh '''
                        ssh -i /var/jenkins_home/.ssh/id_ed25519 \
                          -o BatchMode=yes \
                          -o IdentitiesOnly=yes \
                          -o StrictHostKeyChecking=no \
                          -o UserKnownHostsFile=/dev/null \
                          deploy@192.168.56.13 \
                          /opt/app/rollback.sh || true
                    '''
                }
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    set -eu
                    ssh -i /var/jenkins_home/.ssh/id_ed25519 \
                      -o BatchMode=yes \
                      -o IdentitiesOnly=yes \
                      -o StrictHostKeyChecking=no \
                      -o UserKnownHostsFile=/dev/null \
                      deploy@192.168.56.13 \
                        /opt/app/verify-release.sh
                  '''
              }
            post {
                failure {
                    sh '''
                        ssh -i /var/jenkins_home/.ssh/id_ed25519 \
                          -o BatchMode=yes \
                          -o IdentitiesOnly=yes \
                          -o StrictHostKeyChecking=no \
                          -o UserKnownHostsFile=/dev/null \
                          deploy@192.168.56.13 \
                          /opt/app/rollback.sh || true
                    '''
                }
            }
        }
}
}
