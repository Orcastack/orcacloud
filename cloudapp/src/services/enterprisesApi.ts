import apiClient from './apiClient';
import type {
  Enterprise,
  CreateEnterprisePayload,
  EnterpriseTeam,
  CreateTeamPayload,
  EnterpriseGroup,
  CreateGroupPayload,
  MigrationRun,
} from '../types/enterprise';

export const enterprisesApi = {
  async list(): Promise<Enterprise[]> {
    const res = await apiClient.get('/api/enterprises/');
    // API returns either {data: [...] } or plain list depending on caller; normalize
    return res.data && res.data.data ? res.data.data : res.data;
  },

  async get(enterpriseId: number | string): Promise<Enterprise> {
    const res = await apiClient.get(`/api/enterprises/${enterpriseId}`);
    return res.data;
  },

  async create(payload: CreateEnterprisePayload): Promise<Enterprise> {
    const res = await apiClient.post('/api/enterprises/', payload);
    return res.data;
  },

  async teams(enterpriseId: number | string): Promise<EnterpriseTeam[]> {
    const res = await apiClient.get(`/api/enterprises/${enterpriseId}/teams/`);
    return res.data && res.data.data ? res.data.data : res.data;
  },

  async addTeam(enterpriseId: number | string, payload: CreateTeamPayload): Promise<EnterpriseTeam> {
    const res = await apiClient.post(`/api/enterprises/${enterpriseId}/teams/`, payload);
    return res.data;
  },

  async groups(enterpriseId: number | string): Promise<EnterpriseGroup[]> {
    const res = await apiClient.get(`/api/enterprises/${enterpriseId}/groups/`);
    return res.data && res.data.data ? res.data.data : res.data;
  },

  async createGroup(enterpriseId: number | string, payload: CreateGroupPayload): Promise<EnterpriseGroup> {
    const res = await apiClient.post(`/api/enterprises/${enterpriseId}/groups/`, payload);
    return res.data;
  },

  async migrationRuns(enterpriseId: number | string): Promise<MigrationRun[]> {
    const res = await apiClient.get(`/api/enterprises/${enterpriseId}/migration/runs/`);
    return res.data && res.data.data ? res.data.data : res.data;
  }
};

export default enterprisesApi;

// Backwards-compatible named export used by older pages that import `enterpriseApi`
export const __enterpriseApi = {
  async getEnterprise(enterpriseId: number | string): Promise<Enterprise> {
    return enterprisesApi.get(enterpriseId);
  },
  async createEnterprise(payload: CreateEnterprisePayload): Promise<Enterprise> {
    return enterprisesApi.create(payload);
  }
};
