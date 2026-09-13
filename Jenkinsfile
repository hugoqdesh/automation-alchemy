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

        stage('Push') {
            steps {
                sh '''
                    set -eu
                    docker push "$REGISTRY/$IMAGE_NAME:$GIT_COMMIT"
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
                      "docker pull '$image' && /opt/app/deploy.sh '$image' && /opt/app/verify-release.sh"
                '''
            }
        }
    }
}
