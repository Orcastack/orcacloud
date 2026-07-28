import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';
import RouteIcon from '@mui/icons-material/AltRoute';
import DnsIcon from '@mui/icons-material/Dns';
import HubIcon from '@mui/icons-material/Hub';
import {
  networkArchitectureApi,
} from '../services/cloudApi';
import { dashboardCardSx, dashboardPrimaryButtonSx, dashboardSecondaryButtonSx, dashboardTokens } from '../styles/dashboardDesignSystem';
import type {
  DNSRecord,
  FlowLogsResponse,
  InternetGateway,
  NATGateway,
  RouteTable,
  SecurityGroup,
  Subnet,
  TopologyResponse,
  VPC,
} from '../types/network';

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'running' || status === 'available' || status === 'active') return 'success';
  if (status === 'pending' || status === 'provisioning' || status === 'creating') return 'warning';
  if (status === 'error' || status === 'failed') return 'error';
  return 'default';
};

const NetworkPage: React.FC = () => {
  const [vpcs, setVpcs] = useState<VPC[]>([]);
  const [selectedVpc, setSelectedVpc] = useState<VPC | null>(null);
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [securityGroups, setSecurityGroups] = useState<SecurityGroup[]>([]);
  const [routeTables, setRouteTables] = useState<RouteTable[]>([]);
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [internetGateways, setInternetGateways] = useState<InternetGateway[]>([]);
  const [natGateways, setNatGateways] = useState<NATGateway[]>([]);
  const [topology, setTopology] = useState<TopologyResponse | null>(null);
  const [flowLogs, setFlowLogs] = useState<FlowLogsResponse | null>(null);
  const [tab, setTab] = useState(0);

  const [openVpcDialog, setOpenVpcDialog] = useState(false);
  const [openSubnetDialog, setOpenSubnetDialog] = useState(false);

  const [vpcForm, setVpcForm] = useState({
    name: '',
    description: '',
    cidr_block: '10.0.0.0/16',
    region: 'us-west-2',
  });

  const [subnetForm, setSubnetForm] = useState({
    cidr_block: '10.0.1.0/24',
    availability_zone: 'us-west-2a',
    map_public_ip_on_launch: true,
    name: '',
  });

  const [securityGroupForm, setSecurityGroupForm] = useState({
    name: '',
    description: '',
  });

  const [routeTableForm, setRouteTableForm] = useState({
    name: '',
    description: '',
  });

  const [defaultRouteForm, setDefaultRouteForm] = useState({
    target_type: 'internet-gateway' as 'internet-gateway' | 'nat-gateway',
    target_id: '',
  });

  const [dnsForm, setDnsForm] = useState({
    zone_id: 'internal.atonix.local',
    name: 'api.internal.atonix.local',
    record_type: 'A',
    ttl: 300,
    values: '10.0.1.10',
    routing_policy: 'simple',
  });

  const [gatewayForm, setGatewayForm] = useState({
    igw_name: 'primary-igw',
    nat_name: 'private-nat',
  });

  const loadVpcList = useCallback(() => {
    networkArchitectureApi.listVpcs()
      .then((response: any) => {
        const items = response.data?.results ?? response.data ?? [];
        setVpcs(items);
        if (!selectedVpc && items.length) setSelectedVpc(items[0]);
      })
      .catch(() => {});
  }, [selectedVpc]);

  const loadNetworkingResources = useCallback((vpc?: VPC | null) => {
    const selected = vpc || selectedVpc;
    if (!selected) return;

    Promise.all([
      networkArchitectureApi.listSubnets(),
      networkArchitectureApi.listSecurityGroups(),
      networkArchitectureApi.listRouteTables(),
      networkArchitectureApi.listDnsRecords(),
      networkArchitectureApi.listInternetGateways(),
      networkArchitectureApi.listNatGateways(),
      networkArchitectureApi.topology(selected.resource_id),
      networkArchitectureApi.flowLogs(selected.resource_id),
    ])
      .then(([subnetsRes, sgRes, routeRes, dnsRes, igRes, natRes, topologyRes, flowRes]: any) => {
        const allSubnets = subnetsRes.data?.results ?? subnetsRes.data ?? [];
        const allSG = sgRes.data?.results ?? sgRes.data ?? [];
        const allRoutes = routeRes.data?.results ?? routeRes.data ?? [];
        const allDns = dnsRes.data?.results ?? dnsRes.data ?? [];
        const allIgw = igRes.data?.results ?? igRes.data ?? [];
        const allNat = natRes.data?.results ?? natRes.data ?? [];

        setSubnets(allSubnets.filter((subnet: Subnet) => subnet.vpc === selected.id || subnet.vpc_name === selected.name));
        setSecurityGroups(allSG.filter((securityGroup: SecurityGroup) => !securityGroup.vpc_id || securityGroup.vpc_id === selected.vpc_id));
        setRouteTables(allRoutes.filter((routeTable: RouteTable) => routeTable.vpc_name === selected.name));
        setDnsRecords(allDns);
        setInternetGateways(allIgw.filter((gateway: InternetGateway) => !gateway.vpc_name || gateway.vpc_name === selected.name));
        setNatGateways(allNat);
        setTopology(topologyRes.data || null);
        setFlowLogs(flowRes.data || null);
      })
      .catch(() => {});
  }, [selectedVpc]);

  useEffect(() => { loadVpcList(); }, [loadVpcList]);

  useEffect(() => {
    if (selectedVpc?.resource_id) {
      loadNetworkingResources(selectedVpc);
    }
  }, [selectedVpc, loadNetworkingResources]);

  const stats = useMemo(() => {
    const total = vpcs.length;
    const withFlowLogs = vpcs.filter(vpc => vpc.flow_logs_enabled).length;
    const totalSubnets = subnets.length;
    return { total, withFlowLogs, totalSubnets };
  }, [vpcs, subnets]);

  const createVpc = async () => {
    if (!vpcForm.name.trim()) return;
    await networkArchitectureApi.createVpc(vpcForm);
    setOpenVpcDialog(false);
    setVpcForm(prev => ({ ...prev, name: '', description: '' }));
    loadVpcList();
  };

  const createSubnet = async () => {
    if (!selectedVpc?.id) return;
    await networkArchitectureApi.createSubnet({
      ...subnetForm,
      vpc: String(selectedVpc.id),
    });
    setOpenSubnetDialog(false);
    setSubnetForm(prev => ({ ...prev, name: '' }));
    loadNetworkingResources(selectedVpc);
  };

  const createSecurityGroup = async () => {
    if (!selectedVpc?.id || !securityGroupForm.name.trim()) return;
    await networkArchitectureApi.createSecurityGroup({
      ...securityGroupForm,
      vpc: String(selectedVpc.id),
    });
    setSecurityGroupForm({ name: '', description: '' });
    loadNetworkingResources(selectedVpc);
  };

  const createRouteTable = async () => {
    if (!selectedVpc?.id || !routeTableForm.name.trim()) return;
    await networkArchitectureApi.createRouteTable({
      ...routeTableForm,
      vpc: String(selectedVpc.id),
      is_main: false,
    });
    setRouteTableForm({ name: '', description: '' });
    loadNetworkingResources(selectedVpc);
  };

  const createDnsRecord = async () => {
    await networkArchitectureApi.createDnsRecord({
      zone_id: dnsForm.zone_id,
      name: dnsForm.name,
      record_type: dnsForm.record_type,
      ttl: Number(dnsForm.ttl),
      values: dnsForm.values.split(',').map(value => value.trim()).filter(Boolean),
      routing_policy: dnsForm.routing_policy,
    });
    loadNetworkingResources(selectedVpc);
  };

  const createInternetGateway = async () => {
    if (!selectedVpc?.id) return;
    await networkArchitectureApi.createInternetGateway({
      name: gatewayForm.igw_name,
      description: 'Internet gateway',
      vpc: String(selectedVpc.id),
    });
    loadNetworkingResources(selectedVpc);
  };

  const createNatGateway = async () => {
    if (!subnets.length) return;
    await networkArchitectureApi.createNatGateway({
      name: gatewayForm.nat_name,
      description: 'NAT gateway',
      subnet: subnets[0].subnet_id,
    });
    loadNetworkingResources(selectedVpc);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%', bgcolor: dashboardTokens.colors.background }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} color={dashboardTokens.colors.textPrimary}>Network Architecture</Typography>
          <Typography variant="body2" color="text.secondary">Design VPCs, segmented subnets, routing, gateways, DNS, and zero-trust controls.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadVpcList(); if (selectedVpc) loadNetworkingResources(selectedVpc); }} sx={dashboardSecondaryButtonSx}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenVpcDialog(true)} sx={dashboardPrimaryButtonSx}>Create VPC</Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <Card sx={{ ...dashboardCardSx, flex: 1 }}><CardContent><Typography color="text.secondary">VPCs</Typography><Typography variant="h4">{stats.total}</Typography></CardContent></Card>
        <Card sx={{ ...dashboardCardSx, flex: 1 }}><CardContent><Typography color="text.secondary">Subnets</Typography><Typography variant="h4">{stats.totalSubnets}</Typography></CardContent></Card>
        <Card sx={{ ...dashboardCardSx, flex: 1 }}><CardContent><Typography color="text.secondary">Flow Logs Enabled</Typography><Typography variant="h4">{stats.withFlowLogs}</Typography></CardContent></Card>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2 }}>
        <Card sx={dashboardCardSx}>
          <CardContent>
            <Typography fontWeight={600} mb={1}>VPCs</Typography>
            <List sx={{ p: 0 }}>
              {vpcs.map(vpc => (
                <ListItemButton
                  key={vpc.resource_id}
                  selected={selectedVpc?.resource_id === vpc.resource_id}
                  onClick={() => setSelectedVpc(vpc)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText primary={vpc.name} secondary={`${vpc.cidr_block} • ${vpc.region}`} />
                  <Chip size="small" label={vpc.status} color={statusColor(vpc.status)} />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>

        <Card sx={dashboardCardSx}>
          <CardContent>
            {!selectedVpc ? (
              <Typography color="text.secondary">Select a VPC to configure network architecture.</Typography>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{selectedVpc.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedVpc.vpc_id} • {selectedVpc.cidr_block}</Typography>
                  </Box>
                  <Button variant="outlined" onClick={async () => {
                    await networkArchitectureApi.configureFlowLogs(selectedVpc.resource_id, !selectedVpc.flow_logs_enabled, selectedVpc.flow_logs_destination || 'monitoring://vpc-flow-logs');
                    loadVpcList();
                    loadNetworkingResources(selectedVpc);
                  }}>
                    {selectedVpc.flow_logs_enabled ? 'Disable Flow Logs' : 'Enable Flow Logs'}
                  </Button>
                </Stack>
                <Divider sx={{ mb: 1.5 }} />

                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                  <Tab label="Subnets" icon={<HubIcon />} iconPosition="start" />
                  <Tab label="Security" icon={<SecurityIcon />} iconPosition="start" />
                  <Tab label="Routing" icon={<RouteIcon />} iconPosition="start" />
                  <Tab label="DNS & Logs" icon={<DnsIcon />} iconPosition="start" />
                </Tabs>

                {tab === 0 && (
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">Subnet Segmentation</Typography>
                      <Button size="small" variant="contained" onClick={() => setOpenSubnetDialog(true)} sx={dashboardPrimaryButtonSx}>Add Subnet</Button>
                    </Stack>
                    {subnets.map(subnet => (
                      <Card key={subnet.subnet_id} variant="outlined">
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={600}>{subnet.name || subnet.subnet_id}</Typography>
                            <Chip size="small" label={subnet.tags?.tier || (subnet.map_public_ip_on_launch ? 'public' : 'private')} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">{subnet.cidr_block} • {subnet.availability_zone} • {subnet.available_ip_count ?? 0} IPs</Typography>
                          <Stack direction="row" spacing={1} mt={1}>
                            <Button size="small" variant="outlined" onClick={async () => {
                              await networkArchitectureApi.setSubnetTier(subnet.subnet_id, 'public');
                              loadNetworkingResources(selectedVpc);
                            }}>Set Public</Button>
                            <Button size="small" variant="outlined" onClick={async () => {
                              await networkArchitectureApi.setSubnetTier(subnet.subnet_id, 'private');
                              loadNetworkingResources(selectedVpc);
                            }}>Set Private</Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                    {!subnets.length && <Typography color="text.secondary">No subnets for this VPC.</Typography>}
                  </Stack>
                )}

                {tab === 1 && (
                  <Stack spacing={2}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2">Security Groups</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField size="small" label="Name" value={securityGroupForm.name} onChange={event => setSecurityGroupForm(prev => ({ ...prev, name: event.target.value }))} />
                        <TextField size="small" label="Description" value={securityGroupForm.description} onChange={event => setSecurityGroupForm(prev => ({ ...prev, description: event.target.value }))} />
                        <Button variant="contained" onClick={createSecurityGroup} sx={dashboardPrimaryButtonSx}>Create</Button>
                      </Stack>
                    </CardContent></Card>

                    {securityGroups.map(securityGroup => (
                      <Card key={securityGroup.resource_id} variant="outlined">
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={600}>{securityGroup.name}</Typography>
                            <Chip size="small" label={`${securityGroup.rule_count || 0} rules`} />
                          </Stack>
                          <Stack direction="row" spacing={1} mt={1}>
                            <Button size="small" variant="outlined" onClick={async () => {
                              await networkArchitectureApi.applySecurityTemplate(securityGroup.resource_id, 'web-public');
                              loadNetworkingResources(selectedVpc);
                            }}>Apply Web Template</Button>
                            <Button size="small" variant="outlined" onClick={async () => {
                              await networkArchitectureApi.applySecurityTemplate(securityGroup.resource_id, 'private-service');
                              loadNetworkingResources(selectedVpc);
                            }}>Apply Private Template</Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                    {!securityGroups.length && <Typography color="text.secondary">No security groups yet.</Typography>}
                  </Stack>
                )}

                {tab === 2 && (
                  <Stack spacing={2}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2">Route Tables</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField size="small" label="Name" value={routeTableForm.name} onChange={event => setRouteTableForm(prev => ({ ...prev, name: event.target.value }))} />
                        <TextField size="small" label="Description" value={routeTableForm.description} onChange={event => setRouteTableForm(prev => ({ ...prev, description: event.target.value }))} />
                        <Button variant="contained" onClick={createRouteTable} sx={dashboardPrimaryButtonSx}>Create</Button>
                      </Stack>
                    </CardContent></Card>

                    {routeTables.map(routeTable => (
                      <Card key={routeTable.resource_id} variant="outlined">
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography fontWeight={600}>{routeTable.name || routeTable.route_table_id}</Typography>
                            <Chip size="small" label={routeTable.is_main ? 'Main' : 'Custom'} />
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <TextField select size="small" label="Target Type" value={defaultRouteForm.target_type} onChange={event => setDefaultRouteForm(prev => ({ ...prev, target_type: event.target.value as any }))} sx={{ width: 170 }}>
                              <MenuItem value="internet-gateway">internet-gateway</MenuItem>
                              <MenuItem value="nat-gateway">nat-gateway</MenuItem>
                            </TextField>
                            <TextField size="small" label="Target ID" value={defaultRouteForm.target_id} onChange={event => setDefaultRouteForm(prev => ({ ...prev, target_id: event.target.value }))} />
                            <Button variant="outlined" onClick={async () => {
                              await networkArchitectureApi.setDefaultRoute(routeTable.resource_id, defaultRouteForm.target_type, defaultRouteForm.target_id);
                              loadNetworkingResources(selectedVpc);
                            }}>Set 0.0.0.0/0</Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}

                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2">Gateways</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField size="small" label="IGW Name" value={gatewayForm.igw_name} onChange={event => setGatewayForm(prev => ({ ...prev, igw_name: event.target.value }))} />
                        <Button variant="outlined" onClick={createInternetGateway}>Create IGW</Button>
                        <TextField size="small" label="NAT Name" value={gatewayForm.nat_name} onChange={event => setGatewayForm(prev => ({ ...prev, nat_name: event.target.value }))} />
                        <Button variant="outlined" onClick={createNatGateway}>Create NAT</Button>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" mt={1}>IGWs: {internetGateways.length} • NATs: {natGateways.length}</Typography>
                    </CardContent></Card>
                  </Stack>
                )}

                {tab === 3 && (
                  <Stack spacing={2}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2">DNS Records</Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <TextField size="small" label="Zone" value={dnsForm.zone_id} onChange={event => setDnsForm(prev => ({ ...prev, zone_id: event.target.value }))} />
                        <TextField size="small" label="Name" value={dnsForm.name} onChange={event => setDnsForm(prev => ({ ...prev, name: event.target.value }))} />
                        <TextField select size="small" label="Type" value={dnsForm.record_type} onChange={event => setDnsForm(prev => ({ ...prev, record_type: event.target.value }))} sx={{ width: 110 }}>
                          <MenuItem value="A">A</MenuItem>
                          <MenuItem value="CNAME">CNAME</MenuItem>
                          <MenuItem value="TXT">TXT</MenuItem>
                        </TextField>
                        <Button variant="contained" onClick={createDnsRecord} sx={dashboardPrimaryButtonSx}>Create</Button>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>Records: {dnsRecords.length}</Typography>
                    </CardContent></Card>

                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2">Topology Summary</Typography>
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Subnets: {topology?.subnets?.length || 0} • Route Tables: {topology?.route_tables?.length || 0} • Security Groups: {topology?.security_groups?.length || 0}
                      </Typography>
                    </CardContent></Card>

                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2">Flow Logs</Typography>
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Destination: {flowLogs?.destination || 'not configured'} • Events sampled: {flowLogs?.events?.length || 0}
                      </Typography>
                    </CardContent></Card>
                  </Stack>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openVpcDialog} onClose={() => setOpenVpcDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create VPC</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField label="Name" value={vpcForm.name} onChange={event => setVpcForm(prev => ({ ...prev, name: event.target.value }))} />
          <TextField label="Description" value={vpcForm.description} onChange={event => setVpcForm(prev => ({ ...prev, description: event.target.value }))} />
          <TextField label="CIDR" value={vpcForm.cidr_block} onChange={event => setVpcForm(prev => ({ ...prev, cidr_block: event.target.value }))} />
          <TextField label="Region" value={vpcForm.region} onChange={event => setVpcForm(prev => ({ ...prev, region: event.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVpcDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={createVpc} sx={dashboardPrimaryButtonSx}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openSubnetDialog} onClose={() => setOpenSubnetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Subnet</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField label="Name" value={subnetForm.name} onChange={event => setSubnetForm(prev => ({ ...prev, name: event.target.value }))} />
          <TextField label="CIDR" value={subnetForm.cidr_block} onChange={event => setSubnetForm(prev => ({ ...prev, cidr_block: event.target.value }))} />
          <TextField label="Availability Zone" value={subnetForm.availability_zone} onChange={event => setSubnetForm(prev => ({ ...prev, availability_zone: event.target.value }))} />
          <TextField select label="Tier" value={subnetForm.map_public_ip_on_launch ? 'public' : 'private'} onChange={event => setSubnetForm(prev => ({ ...prev, map_public_ip_on_launch: event.target.value === 'public' }))}>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="private">Private</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSubnetDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={createSubnet} sx={dashboardPrimaryButtonSx}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NetworkPage;
