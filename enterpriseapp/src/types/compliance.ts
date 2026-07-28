export interface ComplianceControl {
  id: string;
  name: string;
  category: string;
  status: 'implemented' | 'partial' | 'missing' | string;
}

export interface ComplianceSnapshot {
  collected_at: string;
  identity_access: {
    admin_groups_count: number;
    active_api_keys_count: number;
    iam_maturity: string;
  };
  encryption: {
    customer_keys_total: number;
    customer_keys_active: number;
    at_rest_supported: boolean;
    in_transit_supported: boolean;
  };
  zero_trust: {
    score: number;
    k8s_clusters_total: number;
    k8s_rbac_enabled: number;
    k8s_network_policy_enabled: number;
    security_groups_count: number;
    vpcs_count: number;
  };
  auditability: {
    audit_logs_last_30d: number;
    evidence_retention_days: number;
  };
}

export interface ComplianceControlStatus {
  framework: 'soc2' | 'iso27001' | 'gdpr' | string;
  completion_percent: number;
  controls: ComplianceControl[];
  snapshot: ComplianceSnapshot;
}

export interface EvidencePackResult {
  report_id: string;
  checksum_sha256: string;
  evidence_pack: {
    framework: string;
    tenant: string;
    generated_at: string;
    controls: Array<{ id: string; name: string; category: string }>;
    snapshot: ComplianceSnapshot;
  };
}

export interface ComplianceAttestation {
  framework: string;
  period_start: string;
  period_end: string;
  declared_by: string;
  declared_at: string;
  summary: {
    zero_trust_score: number;
    iam_maturity: string;
    audit_logs_last_30d: number;
  };
  note: string;
}
