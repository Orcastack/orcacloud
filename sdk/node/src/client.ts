import axios, { AxiosInstance } from 'axios';

export class OrcaCloudClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string, token: string, timeout = 30000) {
    this.http = axios.create({
      baseURL,
      timeout,
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  listInstances() {
    return this.http.get('/api/services/instances/');
  }

  listVpcs() {
    return this.http.get('/api/services/vpcs/');
  }

  complianceControls(framework: 'soc2' | 'iso27001' | 'gdpr' = 'soc2') {
    return this.http.get(`/api/services/compliance/control_status/?framework=${framework}`);
  }

  collectEvidence(framework: 'soc2' | 'iso27001' | 'gdpr' = 'soc2') {
    return this.http.post('/api/services/compliance/collect_evidence/', { framework });
  }

  graphql(query: string, variables: Record<string, unknown> = {}) {
    return this.http.post('/api/graphql/', { query, variables });
  }
}
