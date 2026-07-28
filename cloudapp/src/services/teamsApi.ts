import apiClient from './apiClient';

export const teamsApi = {
  async list(enterpriseId: string) {
    try {
      const res = await apiClient.get(`/api/enterprises/${enterpriseId}/teams`);
      // backend returns { data: [ ... ] } - normalize
      return res.data && res.data.data ? res.data.data : res.data;
    } catch (err) {
      const raw = localStorage.getItem(`teams_${enterpriseId}`) || '[]';
      return JSON.parse(raw);
    }
  },
  async create(enterpriseId: string, payload: any) {
    try {
      const res = await apiClient.post(`/api/enterprises/${enterpriseId}/teams`, payload);
      return res.data;
    } catch (err) {
      const raw = localStorage.getItem(`teams_${enterpriseId}`) || '[]';
      const arr = JSON.parse(raw);
      const item = { id: Date.now(), ...payload };
      arr.push(item);
      localStorage.setItem(`teams_${enterpriseId}`, JSON.stringify(arr));
      return item;
    }
  }
};

export default teamsApi;
