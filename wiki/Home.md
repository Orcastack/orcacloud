# OrcaCloud Project Overview

OrcaCloud is a modular cloud-native control plane for building and operating cloud services through a consistent, programmable interface. It combines a Django API, React-based developer experiences, OpenStack integrations, and infrastructure automation assets for public, private, and hybrid cloud environments.

## The Problem

Cloud teams often operate compute, networking, storage, identity, and automation as disconnected systems. That creates inconsistent tenant controls, duplicated integration logic, and limited auditability. OrcaCloud provides a workspace-aware orchestration layer so developers and operators can request infrastructure through one API while the platform applies the correct project, region, policy, and quota.

## Who It Is For

| Audience | Value |
| --- | --- |
| Platform engineers | A structured control plane for OpenStack, Kubernetes, networking, and automation assets |
| Application developers | A consistent API and dashboard for requesting cloud resources |
| Enterprise operators | Tenant isolation, audit records, runbooks, and region-aware cloud models |
| DevOps teams | Version-controlled CI/CD, infrastructure automation, and observability integration |

## Key Capabilities

- Workspace-bound OpenStack provisioning and regional tenancy
- Compute, network, storage, identity, and automation integration points
- React dashboard applications and Django REST APIs
- Terraform, Ansible, Kubernetes, Helm, GitOps, and serverless assets
- Prometheus, Grafana, Alertmanager, logging, and tracing configuration
- Multi-architecture CI image publishing and reproducible deployment artifacts

## Read the Wiki

1. [[System Architecture]] explains the platform structure and boundaries.
2. [[Modules and Components]] maps repository modules to their responsibilities.
3. [[Use Cases]] describes the intended developer and operator outcomes.
4. [[System Workflows]] shows key request and provisioning flows.
5. [[Development Guide]] explains how to navigate and contribute to the codebase.

The material here is a conceptual and developer reference. It does not require readers to build containers or run a local environment.
