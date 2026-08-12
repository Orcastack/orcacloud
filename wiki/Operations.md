# Operations

## Application Operations

The Docker production stack is controlled through the `prod` Compose profile:

```bash
cd /srv/orcacloud
docker compose --profile prod ps
docker compose --profile prod logs --tail=100 cloudapi nginx
docker compose --profile prod restart cloudapi
```

Start with application health, reverse-proxy logs, and the database/cache container status before changing configuration.

## Incident Response

Use the incident severity model to set response priority:

| Severity | Meaning | Typical response |
| --- | --- | --- |
| P1 | Critical service or data availability risk | Start response immediately and escalate |
| P2 | Major degradation | Investigate within two hours |
| P3 | Moderate degradation | Schedule remediation |
| P4 | Minor issue | Track and address in normal operations |

The detailed incident runbook covers Ceph health, OSD and monitor failures, Nova API failures, Neutron agent failures, Cinder failures, and Keystone authentication problems.

## Capacity and Scaling

Monitor these primary signals:

| Area | Signal | Initial response |
| --- | --- | --- |
| Compute | Hypervisor memory or vCPU pressure | Add a compute node through Ansible and verify Nova registration |
| Storage | Ceph near-full or OSD near-full | Rebalance, add OSD capacity, and wait for `active+clean` placement groups |
| Tenant quota | Project quota near limit | Update the workspace binding and OpenStack quota |
| Networking | Floating IP allocation exhaustion | Expand the external subnet allocation pool |

Do not declare a Ceph expansion complete until cluster placement groups are `active+clean`.

## Tenant Onboarding

A tenant onboarding sequence is:

1. Create the OrcaCloud workspace.
2. Bind it to the correct environment, OpenStack project, region, and quota.
3. Create the Keystone project and assign tenant roles.
4. Provision the tenant network appropriate to public, private, or hybrid mode.
5. Verify the workspace binding, service catalog, project quota, and network.

## Operational References

- [Incident response runbook](https://github.com/Orcastack/orcacloud/blob/main/docs/runbooks/incident-response.md)
- [Scaling runbook](https://github.com/Orcastack/orcacloud/blob/main/docs/runbooks/scaling.md)
- [Tenant onboarding runbook](https://github.com/Orcastack/orcacloud/blob/main/docs/runbooks/onboarding.md)
- [[Production Deployment]]
