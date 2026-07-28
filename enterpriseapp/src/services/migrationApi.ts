import apiClient from './apiClient';
const ____RUNS_KEY = 'cloud_migration_runs';

export const migrationApi = {
  async listRuns(enterpriseId: string) {
    try {
      const res = await apiClient.get(`/api/enterprises/${enterpriseId}/migration/runs`);
      return res.data;
    } catch (err) {
      const raw = localStorage.getItem(____RUNS_KEY) || '[]';
      return JSON.parse(raw);
    }
  },
  async getRun(enterpriseId: string, runId: string) {
    try {
      const res = await apiClient.get(`/api/enterprises/${enterpriseId}/migration/runs/${runId}`);
      return res.data;
    } catch (err) {
      const raw = localStorage.getItem(____RUNS_KEY) || '[]';
      const runs = JSON.parse(raw);
      return runs.find((r: any) => String(r.id) === String(runId));
    }
  },
  async startMigration(enterpriseId: string, payload: any) {
    try {
      const res = await apiClient.post(`/api/enterprises/${enterpriseId}/migration/runs`, payload);
      return res.data;
    } catch (err) {
      const raw = localStorage.getItem(____RUNS_KEY) || '[]';
      const runs = JSON.parse(raw);
      const run = {
        id: Date.now(),
        status: 'running',
        startedAt: new Date().toISOString(),
        ...payload,
      };
      runs.push(run);
      localStorage.setItem(____RUNS_KEY, JSON.stringify(runs));
      return run;
    }
  },
  async simulateProgress(runId: string, update: (r: any)=>void) {
    // Simple simulation: append logs and update status over time
    const raw = localStorage.getItem(____RUNS_KEY) || '[]';
    const runs = JSON.parse(raw);
    const run = runs.find((r: any) => String(r.id) === String(runId));
    if (!run) return;
    // simulate steps
    const steps = ['Provisioning resources', 'Copying data', 'Finalizing', 'Completed'];
    let i = 0;
    const interval = setInterval(() => {
      if (i >= steps.length) { clearInterval(interval); return; }
      run.logs = run.logs || [];
      run.logs.push(`${new Date().toISOString()} - ${steps[i]}`);
      if (i === steps.length - 1) run.status = 'completed';
      localStorage.setItem(____RUNS_KEY, JSON.stringify(runs));
      update(run);
      i++;
    }, 1500);
    return run;
  }
};

export default migrationApi;
