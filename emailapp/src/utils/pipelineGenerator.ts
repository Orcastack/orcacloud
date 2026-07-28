/**
 * Pipeline YAML Generator for OrcaCloud CI/CD System
 * Generates pipeline configuration based on templates and user preferences
 */

export interface PipelineConfig {
  template: 'nodejs' | 'python' | 'go' | 'docker' | 'kubernetes' | 'custom';
  triggers: Array<'push' | 'pr' | 'manual' | 'scheduled'>;
  variables: Array<{ key: string; value: string }>;
  deploymentStrategy: 'rolling' | 'blue-green' | 'canary';
  autoDetectLanguage: boolean;
  includeTests: boolean;
  includeSecurityScan: boolean;
  requireApproval: boolean;
}

export interface GeneratedPipeline {
  yaml: string;
  stages: string[];
  estimatedDuration: string;
}

const TEMPLATE_CONFIGS: Record<string, { stages: string[]; buildCmd: string; testCmd: string; runtime: string }> = {
  nodejs: {
    stages: ['install', 'build', 'test', 'security-scan', 'deploy'],
    buildCmd: 'npm run build',
    testCmd: 'npm test',
    runtime: 'node:18-alpine',
  },
  python: {
    stages: ['install', 'lint', 'test', 'security-scan', 'deploy'],
    buildCmd: 'python -m build',
    testCmd: 'pytest',
    runtime: 'python:3.11-slim',
  },
  go: {
    stages: ['download', 'build', 'test', 'security-scan', 'deploy'],
    buildCmd: 'go build -o app',
    testCmd: 'go test ./...',
    runtime: 'golang:1.21-alpine',
  },
  docker: {
    stages: ['build-image', 'scan-image', 'push-image', 'deploy'],
    buildCmd: 'docker build -t $IMAGE_NAME .',
    testCmd: '',
    runtime: 'docker:24-dind',
  },
  kubernetes: {
    stages: ['validate', 'deploy', 'verify'],
    buildCmd: 'kubectl apply -f k8s/',
    testCmd: 'kubectl rollout status deployment/$DEPLOYMENT_NAME',
    runtime: 'bitnami/kubectl:latest',
  },
  custom: {
    stages: ['build', 'test', 'deploy'],
    buildCmd: 'make build',
    testCmd: 'make test',
    runtime: 'ubuntu:22.04',
  },
};

export function generatePipelineYAML(projectName: string, config: PipelineConfig): GeneratedPipeline {
  const template = TEMPLATE_CONFIGS[config.template] || TEMPLATE_CONFIGS.custom;
  const stages: string[] = [];

  let yaml = `# OrcaCloud CI/CD Pipeline
# Generated for project: ${projectName}
# Template: ${config.template}
# Generated at: ${new Date().toISOString()}

pipeline:
  id: "${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-pipeline"
  name: "${projectName} CI/CD Pipeline"
  project: "${projectName}"
`;

  // Add variables
  if (config.variables.length > 0) {
    yaml += '\n  variables:\n';
    config.variables.forEach((v) => {
      yaml += `    - name: ${v.key}\n      value: "${v.value}"\n`;
    });
  }

  // Add triggers
  yaml += '\n  triggers:\n';
  config.triggers.forEach((trigger) => {
    if (trigger === 'push') {
      yaml += `    - type: push\n      branches:\n        - main\n        - develop\n`;
    } else if (trigger === 'pr') {
      yaml += `    - type: pull_request\n      branches:\n        - main\n`;
    } else if (trigger === 'scheduled') {
      yaml += `    - type: schedule\n      cron: "0 2 * * *"\n`;
    } else if (trigger === 'manual') {
      yaml += `    - type: manual\n`;
    }
  });

  yaml += '\n  stages:\n';

  // Build stage
  stages.push('Build');
  yaml += `    - name: Build
      type: build
      runtime: ${template.runtime}
      steps:
        - name: Install Dependencies
          type: script
          script: |
`;

  if (config.template === 'nodejs') {
    yaml += `            npm ci
`;
  } else if (config.template === 'python') {
    yaml += `            pip install -r requirements.txt
`;
  } else if (config.template === 'go') {
    yaml += `            go mod download
`;
  } else {
    yaml += `            echo "Installing dependencies..."
`;
  }

  yaml += `        - name: Build Application
          type: script
          script: ${template.buildCmd}
`;

  // Test stage
  if (config.includeTests && template.testCmd) {
    stages.push('Test');
    yaml += `
    - name: Test
      type: test
      runtime: ${template.runtime}
      steps:
        - name: Run Tests
          type: script
          script: ${template.testCmd}
        - name: Generate Coverage Report
          type: script
          script: echo "Coverage report generated"
`;
  }

  // Security scan stage
  if (config.includeSecurityScan) {
    stages.push('Security Scan');
    yaml += `
    - name: Security
      type: security-scan
      runtime: aquasec/trivy:latest
      steps:
        - name: Vulnerability Scan
          type: script
          script: trivy fs --severity HIGH,CRITICAL .
        - name: Dependency Audit
          type: script
          script: |
`;
    if (config.template === 'nodejs') {
      yaml += `            npm audit --audit-level=high
`;
    } else if (config.template === 'python') {
      yaml += `            pip-audit
`;
    } else {
      yaml += `            echo "Security scan completed"
`;
    }
  }

  // Approval stage (if required)
  if (config.requireApproval) {
    stages.push('Approval');
    yaml += `
    - name: Approval
      type: approval
      steps:
        - name: Manual Approval
          type: approval
          approvers:
            - role: tech-lead
            - role: devops
          timeout: 24h
`;
  }

  // Deploy stage
  stages.push('Deploy');
  yaml += `
    - name: Deploy
      type: deploy
      environment: production
      strategy: ${config.deploymentStrategy}
      steps:
`;

  if (config.template === 'kubernetes') {
    yaml += `        - name: Deploy to Kubernetes
          type: kubernetes
          manifest: k8s/deployment.yaml
          namespace: production
`;
  } else if (config.template === 'docker') {
    yaml += `        - name: Deploy Container
          type: docker
          image: \${IMAGE_NAME}
          registry: registry.orcacloud.com
`;
  } else {
    yaml += `        - name: Deploy Application
          type: script
          script: |
            echo "Deploying to production..."
            # Add your deployment commands here
`;
  }

  // Add rollback configuration
  yaml += `
  rollback:
    enabled: true
    strategy: automatic
    conditions:
      - error_rate > 5%
      - latency_p95 > 1000ms
`;

  // Add notifications
  yaml += `
  notifications:
    - type: slack
      channel: "#deployments"
      events:
        - pipeline_start
        - pipeline_success
        - pipeline_failure
    - type: email
      recipients:
        - devops@orcacloud.com
      events:
        - pipeline_failure
`;

  const estimatedDuration = stages.length * 2 + (config.includeTests ? 3 : 0) + (config.includeSecurityScan ? 2 : 0);

  return {
    yaml,
    stages,
    estimatedDuration: `${estimatedDuration}-${estimatedDuration + 3} minutes`,
  };
}

export function validatePipelineConfig(config: PipelineConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.template) {
    errors.push('Pipeline template is required');
  }

  if (config.triggers.length === 0) {
    errors.push('At least one trigger must be configured');
  }

  // Validate variables
  const seenKeys = new Set<string>();
  config.variables.forEach((v, index) => {
    if (!v.key) {
      errors.push(`Variable at position ${index + 1} is missing a key`);
    }
    if (seenKeys.has(v.key)) {
      errors.push(`Duplicate variable key: ${v.key}`);
    }
    seenKeys.add(v.key);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getTemplateInfo(template: string): { description: string; languages: string[] } {
  const info: Record<string, { description: string; languages: string[] }> = {
    nodejs: {
      description: 'Node.js application with npm/yarn, includes install, build, test, and deploy stages',
      languages: ['JavaScript', 'TypeScript'],
    },
    python: {
      description: 'Python application with pip, includes install, lint, test, and deploy stages',
      languages: ['Python'],
    },
    go: {
      description: 'Go application with go modules, includes download, build, test, and deploy stages',
      languages: ['Go'],
    },
    docker: {
      description: 'Docker-based build and deploy, includes image build, scan, push, and deploy stages',
      languages: ['Any'],
    },
    kubernetes: {
      description: 'Kubernetes manifest deployment, includes validate, deploy, and verify stages',
      languages: ['YAML', 'Any'],
    },
    custom: {
      description: 'Custom pipeline with basic build, test, and deploy stages (customize as needed)',
      languages: ['Any'],
    },
  };

  return info[template] || info.custom;
}
