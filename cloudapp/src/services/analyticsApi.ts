import apiClient from './apiClient';

export const analyticsApi = {
  async fetchModelScores(enterpriseId: string, params: any = {}) {
    const res = await apiClient.get(`/api/enterprises/${enterpriseId}/analytics/scores`, { params });
    return res.data;
  }
};

export default analyticsApi;
