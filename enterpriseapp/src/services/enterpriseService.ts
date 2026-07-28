export interface EnterpriseRecord {
  id: string;
  companyName: string;
  companyUrl?: string;
  country?: string;
  companyEmail?: string;
  directorName?: string;
  createdAt: string;
}

const ____STORAGE_KEY = 'orcacloud_enterprises_v1';
const ____LEGACY_STORAGE_KEY = 'atonix_enterprises_v1';

function readAll(): EnterpriseRecord[] {
  try {
    const raw = localStorage.getItem(____STORAGE_KEY) || localStorage.getItem(____LEGACY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EnterpriseRecord[];
  } catch {
    return [];
  }
}

function writeAll(records: EnterpriseRecord[]) {
  const serialized = JSON.stringify(records);
  localStorage.setItem(____STORAGE_KEY, serialized);
  localStorage.setItem(____LEGACY_STORAGE_KEY, serialized);
}

export function createEnterprise(payload: Omit<EnterpriseRecord, 'id' | 'createdAt'>) {
  const records = readAll();
  const id = `ent_${Date.now()}`;
  const record: EnterpriseRecord = { ...payload, id, createdAt: new Date().toISOString() } as EnterpriseRecord;
  records.push(record);
  writeAll(records);
  return record;
}

export function getEnterprise(id: string): EnterpriseRecord | undefined {
  return readAll().find(r => r.id === id);
}

export function listEnterprises(): EnterpriseRecord[] {
  return readAll();
}

const enterpriseAPI = { createEnterprise, getEnterprise, listEnterprises };

export default enterpriseAPI;
