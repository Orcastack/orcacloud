export interface VPC {
  id: number;
  resource_id: string;
  vpc_id: string;
  name: string;
  description?: string;
  cidr_block: string;
  region: string;
  status: string;
  flow_logs_enabled?: boolean;
  flow_logs_destination?: string;
  subnet_count?: number;
  metadata?: Record<string, any>;
}

export interface Subnet {
  subnet_id: string;
  vpc?: string | number;
  vpc_name?: string;
  name?: string;
  cidr_block: string;
  availability_zone: string;
  map_public_ip_on_launch: boolean;
  available_ip_count?: number;
  tags?: Record<string, any>;
}

export interface SecurityGroup {
  resource_id: string;
  sg_id: string;
  name: string;
  vpc_id?: string;
  rule_count?: number;
}

export interface RouteTable {
  resource_id: string;
  route_table_id: string;
  name?: string;
  vpc_name?: string;
  is_main: boolean;
  associated_subnets?: string[];
  route_count?: number;
}

export interface DNSRecord {
  record_id: string;
  zone_id: string;
  name: string;
  record_type: string;
  ttl: number;
  values: string[];
  routing_policy: string;
}

export interface InternetGateway {
  resource_id: string;
  ig_id: string;
  name: string;
  vpc_name?: string;
  status: string;
}

export interface NATGateway {
  resource_id: string;
  nat_gw_id: string;
  name: string;
  subnet_name?: string;
  public_ip: string;
  status: string;
}

export interface TopologyResponse {
  vpc: { id: string; name: string; cidr: string; region: string };
  subnets: Array<{ id: string; cidr: string; az: string; tier: string }>;
  route_tables: Array<{ id: string; name: string; is_main: boolean; associated_subnets: string[] }>;
  security_groups: Array<{ id: string; name: string; rules: number }>;
  internet_gateways: string[];
  nat_gateways: string[];
}

export interface FlowLogsResponse {
  vpc_id: string;
  flow_logs_enabled: boolean;
  destination: string;
  events: Array<{
    timestamp: string;
    subnet_id: string;
    src_ip: string;
    dst_ip: string;
    dst_port: number;
    protocol: string;
    action: string;
  }>;
}
