import axios from 'axios';

const ____api = axios.create({ baseURL: '/api' });

export const ____quantumService = {
  submit: async (circuit: string, shots = 1024, backend = 'simulator') => {
    const resp = await ____api.post('/quantum/submit/', { circuit, shots, backend });
    return resp.data;
  },
  status: async (jobId: string) => {
    const resp = await ____api.get(`/quantum/status/${jobId}/`);
    return resp.data;
  }
};

export default ____quantumService;
