# OrcaCloud – Incident Response Runbook

**Scope:** Responding to infrastructure incidents on the OrcaCloud cloud platform.
**Severity levels:** P1 (critical) / P2 (major) / P3 (moderate) / P4 (minor)
**On-call rotation:** ops@orcacloud.com / PagerDuty policy `atonix-cloud-ops`

---

## Triage Matrix

| Alert Name                        | Severity | Response SLA | Primary Troubleshooting Section  |
|-----------------------------------|----------|-------------|-----------------------------------|
| CephClusterErrorState             | P1       | 15 min      | [Ceph HEALTH_ERR](#ceph-health-err) |
| CephOSDDown                       | P1       | 15 min      | [OSD Down](#ceph-osd-down) |
| CephClusterNearFull               | P2       | 2 hr        | [Ceph Near Full](#ceph-cluster-full) |
| NovaInstanceCreationHighFailureRate | P1     | 20 min      | [Nova API Failure](#nova-api-failure) |
| NeutronAgentDown                  | P1       | 15 min      | [Neutron Agent Down](#neutron-agent-down) |
| NeutronL3AgentAllDown             | P1       | 10 min      | [L3 All Down](#neutron-l3-all-down) |
| CinderVolumeServiceDown           | P1       | 15 min      | [Cinder Service Down](#cinder-service-down) |
| KeystoneHighAuthFailureRate       | P1       | 10 min      | [Keystone Token Down](#keystone-token-down) |
| CephClusterFull                   | P1       | Immediate   | [Ceph Full](#ceph-cluster-full) |

---

## ceph-health-err

**Symptom:** `CephClusterErrorState` alert. `ceph health` returns `HEALTH_ERR`.

**Steps:**
```bash
# 1. Get detail
ceph health detail

# 2. Check OSD status
ceph osd stat
ceph osd tree

# 3. Check PG status
ceph pg stat
ceph pg dump | grep -E 'peering|incomplete|stale'

# 4. Check MON quorum
ceph mon stat
ceph quorum_status | jq .

# 5. Escalate if PG is in 'incomplete' state
#    → Incomplete PGs may require OSD recovery (see #ceph-osd-down)
```

**Common causes:**
- OSD down + under-replicated PGs → resolve OSD first
- `HEALTH_ERR: 1 daemons have recently crashed` → `ceph crash archive-all`
- Full cluster → see [Ceph Full](#ceph-cluster-full)

---

## ceph-health-warn

**Symptom:** `CephClusterWarnState` alert.

```bash
ceph health detail
# Most common: clock skew → fix NTP on all nodes
# Slow OSD ops → check disk I/O: iostat -x 1 10 (on OSD host)
# Large omap objects (librbd) → ceph osd pool set <pool> allow_ec_overwrites true
```

---

## ceph-osd-down

**Symptom:** `CephOSDDown` alert. `ceph osd stat` shows OSD(s) down.

```bash
# 1. Identify which OSD and which host
ceph osd find <osd-id>

# 2. SSH to OSD host and check status
ssh <osd-host>
systemctl status ceph-osd@<osd-id>
journalctl -u ceph-osd@<osd-id> -n 50 --no-pager

# 3. Restart OSD if process crashed
systemctl start ceph-osd@<osd-id>
ceph osd down <osd-id>   # mark down (already is, but resets PG state)
ceph osd mark <osd-id> up

# 4. Check disk health
smartctl -a /dev/<device>
dmesg | tail -50 | grep -iE 'error|fail|ata'

# 5. If disk is failed — mark OSD out and replace
ceph osd out <osd-id>
ceph osd crush remove osd.<osd-id>
ceph auth del osd.<osd-id>
ceph osd rm <osd-id>
# Replace disk, then re-add via: ceph orch daemon add osd <host>:<device>
```

---

## ceph-osd-flapping

**Symptom:** `CephOSDFlapping` alert.

```bash
# Check network between OSD host and MONs
ping -c 10 <mon-ip>
traceroute <mon-ip>

# Check cluster network (back-end replication traffic)
ping -I <cluster_interface_ip> -c 10 <osd-peer-ip>

# Check for NIC errors
ip -s link show <cluster_iface>

# If caused by public network issues: check switch port / bonding config
ethtool <iface>
```

---

## ceph-mon-quorum

**Symptom:** `CephMonDown` or `CephMonQuorumAtRisk` alert.

```bash
# 1. List monitor status
ceph mon stat
ceph mon dump

# 2. Identify which MON is down
ceph -s | grep mon

# 3. SSH to MON host and restart
ssh <mon-host>
systemctl status ceph-mon@<mon-hostname>
systemctl start ceph-mon@<mon-hostname>

# 4. Verify quorum restored
ceph quorum_status | jq '.quorum_names'

# 5. If MON host is permanently down — remove and replace
ceph mon remove <mon-hostname>
# Then re-bootstrap on new host via: ceph orch daemon add mon <new-host>
```

---

## ceph-cluster-full

**Symptom:** `CephClusterNearFull` (>80%) or `CephClusterFull` (>90%) alert.

```bash
# 1. Check capacity
ceph df
ceph osd df tree

# 2. Immediately rebalance if uneven distribution
ceph osd reweight-by-utilization

# 3. Short-term: increase nearfull ratio to buy time
ceph osd set-nearfull-ratio 0.87

# 4. Medium-term: add OSDs
#    Follow scaling runbook → docs/runbooks/scaling.md#add-osd-nodes

# 5. Emergency: purge old snapshots/images
openstack volume snapshot list --all-projects | awk '/available/{print $2}' | \
  while read id; do openstack volume snapshot delete "$id"; done
```

**[WARN] If cluster is at 100%: all writes will be paused.**
```bash
# Temporarily allow over-full writes (USE WITH EXTREME CARE)
ceph osd set nofullstop
# Purge data, then: ceph osd unset nofullstop
```

---

## nova-api-failure

**Symptom:** `NovaInstanceCreationHighFailureRate` alert. VM creation requests returning 500.

```bash
# 1. Check nova services
openstack compute service list

# 2. Check nova-api and nova-conductor logs
journalctl -u nova-api -n 100 --no-pager
journalctl -u nova-conductor -n 100 --no-pager

# 3. Check RabbitMQ connectivity from nova services
rabbitmqctl list_queues | grep -E 'nova|conductor'

# 4. Check MySQL nova DB connectivity
mysql -u nova -p"$NOVA_DB_PASSWORD" nova -e "SELECT 1;"

# 5. Restart nova services if stuck
systemctl restart nova-api nova-conductor nova-scheduler

# 6. Force-delete stuck instances
nova reset-state --active <instance-id>
openstack server delete <instance-id>
```

---

## neutron-agent-down

**Symptom:** `NeutronAgentDown` alert.

```bash
# 1. List all agents and their state
openstack network agent list

# 2. SSH to the affected network node
ssh <network-host>
systemctl status neutron-linuxbridge-agent
systemctl status neutron-l3-agent
systemctl status neutron-dhcp-agent

# 3. Restart affected agent
systemctl restart <neutron-agent>

# 4. Check for connectivity issues (DHCP / L3 failures)
ip netns list
neutron-l3-check-connectivity   # if available

# 5. Verify agent re-registers
openstack network agent list --host <network-host>
```

---

## neutron-l3-all-down

**Symptom:** ALL L3 agents are down. North-south traffic for all tenants fails.

**P1 — Escalate immediately to network lead.**

```bash
# 1. Check all network nodes
ansible openstack_network -m shell -a "systemctl status neutron-l3-agent"

# 2. Restart on all nodes
ansible openstack_network -m systemd -a "name=neutron-l3-agent state=restarted"

# 3. Verify recovery
openstack network agent list --agent-type L3\ agent

# 4. If routers are 'ACTIVE' but traffic is still broken
#    → Reschedule routers
neutron l3-agent-router-add <l3-agent-id> <router-id>
```

---

## cinder-volume-error

**Symptom:** `CinderVolumeHighFailureRate` alert.

```bash
# 1. Check volume in error state
openstack volume list --all-projects --status error

# 2. Check cinder-volume logs
journalctl -u cinder-volume -n 100 --no-pager | grep -i error

# 3. Check Ceph RBD connectivity (most common cause)
rbd ls atonix-public-cinder
ceph osd stat

# 4. Reset stuck volume to available
cinder reset-state <volume-id> --state available
# or delete if orphaned:
openstack volume delete --force <volume-id>
```

---

## cinder-service-down

**Symptom:** `CinderVolumeServiceDown` alert.

```bash
openstack volume service list
ssh <cinder-host>
systemctl restart cinder-volume
openstack volume service list  # confirm re-registration
```

---

## keystone-token-down

**Symptom:** `KeystoneHighAuthFailureRate` alert. Authentication failures across all services.

```bash
# 1. Check Keystone WSGI processes
systemctl status apache2
apachectl status

# 2. Test token issuance manually
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://keystone.orcacloud.com/v3/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"auth":{"identity":{"methods":["password"],"password":{"user":{"name":"admin","domain":{"name":"Default"},"password":"'"$KEYSTONE_ADMIN_PW"'"}}},"scope":{"project":{"name":"admin","domain":{"name":"Default"}}}}}'

# 3. Check Keystone DB
mysql -u keystone -p"$KEYSTONE_DB_PW" keystone -e "SELECT count(*) FROM token;"

# 4. Flush expired tokens
keystone-manage token_flush

# 5. Restart Apache WSGI
systemctl restart apache2
```

---

## api-high-latency

**Symptom:** `OpenStackAPIHighLatency` alert.

```bash
# 1. Check controller load
top -b -n1 | head -20
vmstat 1 10

# 2. Check MySQL slow query log
mysql -e "SHOW PROCESSLIST;"
tail -n 50 /var/log/mysql/mysql-slow.log

# 3. Check RabbitMQ queue depths (Nova/Neutron are most sensitive)
rabbitmqctl list_queues name messages consumers | \
  awk '{if ($2 > 100) print}'

# 4. Restart slow services
systemctl restart nova-api neutron-server cinder-api

# 5. Check memcached connectivity (Keystone token cache)
echo "stats" | nc localhost 11211
```
