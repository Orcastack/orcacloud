// OrcaCloud – Multi-Regional Cloud Management API Service

import axios from 'axios';
import { config } from '../config/environment';

const API_BASE = config.API_BASE_URL;

// =====================
// Types & Interfaces
// =====================

export type CloudType = 'public' | 'private' | 'hybrid';
export type RegionStatus = 'active' | 'degraded' | 'maintenance' | 'unavailable';
export type ConnectivityType = 'internet' | 'vpn' | 'direct_connect' | 'peering';

export interface AvailabilityZone {
  id: number;
  name: string;
  region_code: string;
  is_active: boolean;
}

export interface CloudRegion {
  id: number;
  code: string;
  name: string;
  country: string;
  city: string;
  continent: string;
  latitude: number;
  longitude: number;
  status: RegionStatus;
  uptime_30d_pct: number;
  latency_ms: number | null;
  enabled_services: string[];
  api_endpoint: string;
  cloud_type: CloudType;
  cloud_type_display: string;
  connectivity_type: ConnectivityType;
  connectivity_type_display: string;
  vpn_gateway_ip: string | null;
  tenant_isolation: boolean;
  zones: AvailabilityZone[];
  available_services: ServiceCatalogEntry[];
}

export interface RegionPeer {
  id: number;
  primary_region_code: string;
  secondary_region_code: string;
  rto_minutes: number;
  rpo_minutes: number;
  last_failover_test: string | null;
}

export interface ServiceCatalogEntry {
  slug: string;
  name: string;
  description: string;
  available_in: CloudType[];
}

export interface ServiceCatalog {
  public?: ServiceCatalogEntry[];
  private?: ServiceCatalogEntry[];
  hybrid?: ServiceCatalogEntry[];
}

export interface RegionAvailabilitySnapshot {
  region_code: string;
  name: string;
  status: RegionStatus;
  cloud_type: CloudType;
  connectivity_type: ConnectivityType;
  uptime_30d_pct: number;
  latency_ms: number | null;
  active_zones: number;
  total_zones: number;
}

export interface RegionAvailabilityResponse {
  timestamp: string;
  total_regions: number;
  active_regions: number;
  degraded_regions: number;
  regions: RegionAvailabilitySnapshot[];
}

export interface RegionsByTypeEntry {
  cloud_type: CloudType;
  total: number;
  active: number;
  degraded: number;
  avg_uptime: number;
  regions: CloudRegion[];
  catalog: ServiceCatalogEntry[];
}

export interface RegionsByTypeResponse {
  public: RegionsByTypeEntry;
  private: RegionsByTypeEntry;
  hybrid: RegionsByTypeEntry;
}

// =====================
// API Functions
// =====================

/**
 * List all cloud regions with optional filters
 */
export const listRegions = async (params?: {
  cloud_type?: CloudType;
  status?: RegionStatus;
  continent?: string;
}): Promise<CloudRegion[]> => {
  try {
    const response = await axios.get<CloudRegion[]>(`${API_BASE}/services/regions/`, { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('[regionsApi] Failed to list regions:', error);
    return [];
  }
};

/**
 * Get a single region by ID with full details including zones
 */
export const getRegion = async (regionId: number): Promise<CloudRegion | null> => {
  try {
    const response = await axios.get<CloudRegion>(`${API_BASE}/services/regions/${regionId}/`);
    return response.data;
  } catch (error) {
    console.error(`[regionsApi] Failed to get region ${regionId}:`, error);
    return null;
  }
};

/**
 * Update region status (admin only)
 */
export const updateRegionStatus = async (
  regionId: number,
  newStatus: RegionStatus
): Promise<CloudRegion | null> => {
  try {
    const response = await axios.post<CloudRegion>(`${API_BASE}/services/regions/${regionId}/set_status/`, {
      status: newStatus,
    });
    return response.data;
  } catch (error) {
    console.error(`[regionsApi] Failed to update region ${regionId} status:`, error);
    return null;
  }
};

/**
 * Get live availability snapshot of all regions
 */
export const getRegionAvailability = async (): Promise<RegionAvailabilityResponse | null> => {
  try {
    const response = await axios.get<RegionAvailabilityResponse>(`${API_BASE}/services/regions/availability/`);
    return response.data;
  } catch (error) {
    console.error('[regionsApi] Failed to get region availability:', error);
    return null;
  }
};

/**
 * Get regions grouped by cloud type with health statistics
 */
export const getRegionsByType = async (): Promise<RegionsByTypeResponse> => {
  try {
    const response = await axios.get<RegionsByTypeResponse>(`${API_BASE}/services/regions/by_type/`);
    return response.data;
  } catch (error) {
    console.error('[regionsApi] Failed to get regions by type:', error);
    // Return empty structure on error
    return {
      public: { cloud_type: 'public', total: 0, active: 0, degraded: 0, avg_uptime: 0, regions: [], catalog: [] },
      private: { cloud_type: 'private', total: 0, active: 0, degraded: 0, avg_uptime: 0, regions: [], catalog: [] },
      hybrid: { cloud_type: 'hybrid', total: 0, active: 0, degraded: 0, avg_uptime: 0, regions: [], catalog: [] },
    };
  }
};

/**
 * Get full service catalog or filtered by cloud type
 */
export const getServiceCatalog = async (cloudType?: CloudType): Promise<ServiceCatalog> => {
  try {
    const params = cloudType ? { type: cloudType } : {};
    const response = await axios.get<ServiceCatalog>(`${API_BASE}/services/regions/service_catalog/`, { params });
    return response.data;
  } catch (error) {
    console.error('[regionsApi] Failed to get service catalog:', error);
    return {};
  }
};

/**
 * Get services enabled in a specific region
 */
export const getRegionServices = async (regionId: number): Promise<ServiceCatalogEntry[]> => {
  try {
    const response = await axios.get<ServiceCatalogEntry[]>(`${API_BASE}/services/regions/${regionId}/services/`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(`[regionsApi] Failed to get services for region ${regionId}:`, error);
    return [];
  }
};

/**
 * List all region peer relationships (failover pairs)
 */
export const listRegionPeers = async (): Promise<RegionPeer[]> => {
  try {
    const response = await axios.get<RegionPeer[]>(`${API_BASE}/services/region-peers/`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('[regionsApi] Failed to list region peers:', error);
    return [];
  }
};

/**
 * Record a failover test for a region peer
 */
export const testFailover = async (peerId: number): Promise<RegionPeer | null> => {
  try {
    const response = await axios.post<RegionPeer>(`${API_BASE}/services/region-peers/${peerId}/test_failover/`);
    return response.data;
  } catch (error) {
    console.error(`[regionsApi] Failed to test failover for peer ${peerId}:`, error);
    return null;
  }
};

/**
 * List availability zones, optionally filtered by region
 */
export const listZones = async (regionCode?: string): Promise<AvailabilityZone[]> => {
  try {
    const params = regionCode ? { region_code: regionCode } : {};
    const response = await axios.get<AvailabilityZone[]>(`${API_BASE}/services/availability-zones/`, { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('[regionsApi] Failed to list zones:', error);
    return [];
  }
};
