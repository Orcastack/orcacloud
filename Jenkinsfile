// ============================================================
//  OrcaCloud – Multibranch CI/CD Pipeline
//
//  Branch behaviour:
//    • Every branch / PR  → Checkout → Install → Build → Test
//    • main only          → + Deploy to production (k8s + docker-compose)
//
//  Required Jenkins plugins:
//    Pipeline, Git Branch Source, JUnit,
//    Slack Notification, Email Extension, GitHub
//
//  Required Jenkins credentials (Manage Jenkins → Credentials):
//    SLACK_BOT_TOKEN   – Slack bot OAuth token      (Secret text)
//    NOTIFY_EMAIL      – Recipient e-mail address   (Secret text)
//    GITHUB_TOKEN      – GitHub personal access token (Secret text)
//    KUBECONFIG_FILE   – kubeconfig for prod cluster (Secret file)
// ============================================================

pipeline {
    agent any

    // ── Global environment ─────────────────────────────────────────
    environment {
        APP_NAME          = 'orcacloud'
        IMAGE_REGISTRY    = 'orcacloud'
        IMAGE_TAG         = "${env.GIT_COMMIT?.take(7) ?: 'latest'}"

        // Slack
        SLACK_CHANNEL     = '#ci-cd'
        SLACK_CREDENTIALS = 'SLACK_BOT_TOKEN'

        // Email (value injected from Jenkins credentials store)
        NOTIFY_EMAIL      = credentials('NOTIFY_EMAIL')

        PYTHON_BIN        = 'python3'
        NODE_ENV          = 'test'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()        // one build per branch at a time
    }

    // ── Stages ────────────────────────────────────────────────────
    stages {

        // ── 1. Checkout ───────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                sh 'mkdir -p reports'
                script { notifyGitHub('pending', 'Build started') }
            }
        }

        // ── 2. Backend – Install ──────────────────────────────────
        stage('Backend: Install Dependencies') {
            steps {
                dir('backend') {
                    sh '''
                        ${PYTHON_BIN} -m venv .venv
                        . .venv/bin/activate
                        pip install --upgrade pip --quiet
                        pip install -r requirements.txt --quiet
                        pip install pytest pytest-django pytest-cov coverage --quiet
                    '''
                }
            }
        }

        // ── 3. Backend – Unit Tests ───────────────────────────────
        stage('Backend: Unit Tests') {
            steps {
                dir('backend') {
                    sh '''
                        . .venv/bin/activate
                        python -m pytest services/tests/ \
                            --ignore=services/tests/test_integration.py \
                            -v --tb=short \
                            --junitxml=../reports/backend-unit-tests.xml \
                            --cov=services \
                            --cov-report=xml:../reports/backend-coverage.xml \
                            --cov-report=term-missing
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: true,
                          testResults: 'reports/backend-unit-tests.xml'
                }
            }
        }

        // ── 4. Backend – Integration Tests ───────────────────────
        stage('Backend: Integration Tests') {
            steps {
                dir('backend') {
                    sh '''
                        . .venv/bin/activate
                        python -m pytest services/tests/test_integration.py \
                            -v --tb=short -m integration \
                            --junitxml=../reports/backend-integration-tests.xml
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: true,
                          testResults: 'reports/backend-integration-tests.xml'
                }
            }
        }

        // ── 5. Platform / Root-level Tests ───────────────────────
        stage('Platform Tests') {
            steps {
                sh '''
                    ${PYTHON_BIN} -m venv .venv-root
                    . .venv-root/bin/activate
                    pip install --upgrade pip --quiet
                    pip install -r requirements.txt pytest pytest-cov --quiet
                    python -m pytest test_platform.py \
                        -v --tb=short \
                        --junitxml=reports/platform-tests.xml
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true,
                          testResults: 'reports/platform-tests.xml'
                }
            }
        }

        // ── 6. Frontend – Install ─────────────────────────────────
        stage('Frontend: Install Dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm ci --prefer-offline'
                }
            }
        }

        // ── 7. Frontend – Tests ───────────────────────────────────
        stage('Frontend: Tests') {
            environment {
                JEST_JUNIT_OUTPUT_DIR  = '../reports'
                JEST_JUNIT_OUTPUT_NAME = 'frontend-junit.xml'
            }
            steps {
                dir('frontend') {
                    sh '''
                        npm install --save-dev jest-junit --silent
                        CI=true npm test -- \
                            --watchAll=false \
                            --coverage \
                            --coverageDirectory=../reports/frontend-coverage \
                            --reporters=default \
                            --reporters=jest-junit
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: true,
                          testResults: 'reports/frontend-junit.xml'
                }
            }
        }

        // ── 8. Frontend – Build ───────────────────────────────────
        stage('Frontend: Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        // ── 9. Operator (Go) Tests ────────────────────────────────
        stage('Operator: Go Tests') {
            steps {
                dir('orcacloud-operator') {
                    sh '''
                        go mod download
                        go test $(go list ./... | grep -v /e2e) \
                            -v \
                            -coverprofile=../reports/operator-coverage.out \
                            2>&1 | tee ../reports/operator-test.log
                    '''
                }
            }
        }

        // ── 10. Docker – Build Images ─────────────────────────────
        //  Runs on every branch so images are always verifiable.
        stage('Docker: Build Images') {
            steps {
                sh '''
                    docker build \
                        -f Dockerfile.production \
                        -t ${IMAGE_REGISTRY}/${APP_NAME}-backend:${IMAGE_TAG} \
                        .
                    docker build \
                        -f frontend/Dockerfile \
                        -t ${IMAGE_REGISTRY}/${APP_NAME}-frontend:${IMAGE_TAG} \
                        frontend/
                '''
            }
        }

        // ── 11. Deploy to Production ──────────────────────────────
        //  Runs ONLY when the branch is main.
        stage('Deploy: Production') {
            when {
                branch 'main'
            }
            steps {
                echo "Deploying OrcaCloud to production..."

                // Push versioned + latest image tags
                sh '''
                    docker push ${IMAGE_REGISTRY}/${APP_NAME}-backend:${IMAGE_TAG}
                    docker push ${IMAGE_REGISTRY}/${APP_NAME}-frontend:${IMAGE_TAG}

                    docker tag ${IMAGE_REGISTRY}/${APP_NAME}-backend:${IMAGE_TAG} \
                               ${IMAGE_REGISTRY}/${APP_NAME}-backend:latest
                    docker tag ${IMAGE_REGISTRY}/${APP_NAME}-frontend:${IMAGE_TAG} \
                               ${IMAGE_REGISTRY}/${APP_NAME}-frontend:latest
                    docker push ${IMAGE_REGISTRY}/${APP_NAME}-backend:latest
                    docker push ${IMAGE_REGISTRY}/${APP_NAME}-frontend:latest
                '''

                // Apply k8s manifests and roll out
                withCredentials([file(credentialsId: 'KUBECONFIG_FILE',
                                      variable: 'KUBECONFIG')]) {
                    sh '''
                        kubectl apply -f k8s/namespace.yaml
                        kubectl apply -f k8s/backend-deployment.yaml
                        kubectl apply -f k8s/backend-service.yaml
                        kubectl apply -f k8s/frontend-deployment.yaml
                        kubectl apply -f k8s/frontend-service.yaml
                        kubectl apply -f k8s/ingress.yaml

                        kubectl set image deployment/orcacloud-backend \
                            backend=${IMAGE_REGISTRY}/${APP_NAME}-backend:${IMAGE_TAG} \
                            -n orcacloud
                        kubectl set image deployment/orcacloud-frontend \
                            frontend=${IMAGE_REGISTRY}/${APP_NAME}-frontend:${IMAGE_TAG} \
                            -n orcacloud

                        kubectl rollout status deployment/orcacloud-backend \
                            -n orcacloud --timeout=120s
                        kubectl rollout status deployment/orcacloud-frontend \
                            -n orcacloud --timeout=120s
                    '''
                }

                echo "Deployment complete – platform live at https://orcacloud.com"
            }
        }

        // ── 12. Feature-branch notice ─────────────────────────────
        stage('Deploy: Skipped (non-main branch)') {
            when {
                not { branch 'main' }
            }
            steps {
                echo "Branch '${env.BRANCH_NAME}' – build & tests passed. Deploy skipped (main only)."
            }
        }

    } // end stages

    // ── Post-pipeline actions ──────────────────────────────────────
    post {

        always {
            echo "Pipeline #${env.BUILD_NUMBER} finished on branch: ${env.BRANCH_NAME}"
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            sh 'rm -rf backend/.venv .venv-root'
        }

        success {
            script {
                notifyGitHub('success', 'All checks passed')
                slackNotify('good',
                    ":white_check_mark: *${APP_NAME}* – Build *#${env.BUILD_NUMBER}* " +
                    "passed on `${env.BRANCH_NAME}`\n<${env.BUILD_URL}|View build>")
                if (env.BRANCH_NAME == 'main') {
                    emailNotify(
                        subject: "[OrcaCloud CI] Build #${env.BUILD_NUMBER} – ${env.BRANCH_NAME} PASSED",
                        body:    "Build <b>#${env.BUILD_NUMBER}</b> on branch <b>${env.BRANCH_NAME}</b> " +
                                 "succeeded and was deployed to production.<br>" +
                                 "<a href='${env.BUILD_URL}'>Open in Jenkins</a>"
                    )
                }
            }
        }

        failure {
            script {
                notifyGitHub('failure', 'Build failed')
                slackNotify('danger',
                    ":x: *${APP_NAME}* – Build *#${env.BUILD_NUMBER}* " +
                    "FAILED on `${env.BRANCH_NAME}`\n<${env.BUILD_URL}console|View logs>")
                emailNotify(
                    subject: "[OrcaCloud CI] Build #${env.BUILD_NUMBER} – ${env.BRANCH_NAME} FAILED",
                    body:    "Build <b>#${env.BUILD_NUMBER}</b> on branch <b>${env.BRANCH_NAME}</b> " +
                             "<b>FAILED</b>.<br>" +
                             "Please review the <a href='${env.BUILD_URL}console'>console output</a>."
                )
            }
        }

        unstable {
            script {
                notifyGitHub('failure', 'Some tests failed')
                slackNotify('warning',
                    ":warning: *${APP_NAME}* – Build *#${env.BUILD_NUMBER}* " +
                    "UNSTABLE on `${env.BRANCH_NAME}`\n<${env.BUILD_URL}testReport|View test report>")
            }
        }

        aborted {
            script {
                notifyGitHub('error', 'Build was aborted')
                slackNotify('warning',
                    ":octagonal_sign: *${APP_NAME}* – Build *#${env.BUILD_NUMBER}* " +
                    "aborted on `${env.BRANCH_NAME}`")
            }
        }

    } // end post
} // end pipeline

// ============================================================
//  Helper functions
// ============================================================

/**
 * Send a Slack message.
 * @param color   'good' | 'warning' | 'danger'
 * @param message Markdown-compatible Slack message body
 */
def slackNotify(String color, String message) {
    try {
        slackSend(
            channel          : env.SLACK_CHANNEL,
            color            : color,
            message          : message,
            tokenCredentialId: env.SLACK_CREDENTIALS
        )
    } catch (err) {
        echo "Slack notification skipped: ${err.getMessage()}"
    }
}

/**
 * Send an HTML e-mail via the Email Extension plugin.
 * @param args  [subject: String, body: String]
 */
def emailNotify(Map args) {
    try {
        emailext(
            subject  : args.subject,
            body     : args.body,
            to       : env.NOTIFY_EMAIL,
            mimeType : 'text/html'
        )
    } catch (err) {
        echo "Email notification skipped: ${err.getMessage()}"
    }
}

/**
 * Post a GitHub commit status via the REST API.
 * @param state       'pending' | 'success' | 'failure' | 'error'
 * @param description Short human-readable description
 */
def notifyGitHub(String state, String description) {
    try {
        withCredentials([string(credentialsId: 'GITHUB_TOKEN',
                                variable: 'GH_TOKEN')]) {
            def sha = env.GIT_COMMIT ?: ''
            if (!sha) { echo 'GitHub status skipped: no GIT_COMMIT'; return }

            def repoUrl = env.GIT_URL ?: ''
            def matcher = repoUrl =~ /github\.com[:/](.+?)(?:\.git)?$/
            if (!matcher) { echo 'GitHub status skipped: cannot parse repo URL'; return }
            def repoPath = matcher[0][1]

            sh """
                curl -s -o /dev/null -w "GitHub status HTTP: %{http_code}\\n" \\
                    -X POST \\
                    -H "Authorization: token ${GH_TOKEN}" \\
                    -H "Accept: application/vnd.github.v3+json" \\
                    https://api.github.com/repos/${repoPath}/statuses/${sha} \\
                    -d '{
                          "state":       "${state}",
                          "description": "${description}",
                          "context":     "jenkins/ci",
                          "target_url":  "${env.BUILD_URL}"
                        }'
            """
        }
    } catch (err) {
        echo "GitHub status update skipped: ${err.getMessage()}"
    }
}
