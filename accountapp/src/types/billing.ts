// OrcaCloud – Billing Types

export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectable';

export type PaymentMethodType = 'card' | 'bank_account' | 'paypal';

export type CreditNoteReason =
  | 'service_credit' | 'promo' | 'sla' | 'refund' | 'adjustment';

export type UsageMetric =
  | 'compute_hours' | 'storage_gb' | 'bandwidth_gb' | 'api_calls'
  | 'email_sent' | 'db_hours' | 'snapshots' | 'ip_addresses' | 'load_balancers';

// ── Plan ──────────────────────────────────────────────────────────────────────

export interface PlanFeatures {
  compute_hours:  number | null;
  storage_gb:     number | null;
  bandwidth_gb:   number | null;
  api_calls:      number | null;
}

export interface PlanInfo {
  tier:     PlanTier;
  price:    number;
  features: PlanFeatures;
}

// ── Billing Account ───────────────────────────────────────────────────────────

export interface BillingAccount {
  id:             number;
  plan:           PlanTier;
  plan_price:     number;
  plan_features:  PlanFeatures;
  company_name:   string;
  billing_email:  string;
  tax_id:         string;
  address_line1:  string;
  address_line2:  string;
  city:           string;
  state:          string;
  postal_code:    string;
  country:        string;
  currency:       string;
  credit_balance: number;
  auto_pay:       boolean;
  spend_limit:    number | null;
  created_at:     string;
  updated_at:     string;
}

export interface UpdateBillingAccountPayload {
  plan?:          PlanTier;
  company_name?:  string;
  billing_email?: string;
  tax_id?:        string;
  address_line1?: string;
  address_line2?: string;
  city?:          string;
  state?:         string;
  postal_code?:   string;
  country?:       string;
  currency?:      string;
  auto_pay?:      boolean;
  spend_limit?:   number | null;
}

// ── Payment Method ────────────────────────────────────────────────────────────

export interface PaymentMethod {
  id:            number;
  type:          PaymentMethodType;
  is_default:    boolean;
  card_brand:    string;
  card_last4:    string;
  card_exp_month: number | null;
  card_exp_year:  number | null;
  display_name:  string;
  is_verified:   boolean;
  created_at:    string;
}

export interface AddPaymentMethodPayload {
  type:           PaymentMethodType;
  is_default?:    boolean;
  card_brand?:    string;
  card_last4?:    string;
  card_exp_month?: number;
  card_exp_year?:  number;
  display_name?:  string;
}

// ── Invoice ───────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  id:          number;
  service:     string;
  resource_id: string;
  description: string;
  quantity:    number;
  unit:        string;
  unit_price:  number;
  amount:      number;
}

export interface Invoice {
  id:              number;
  invoice_number:  string;
  status:          InvoiceStatus;
  period_start:    string;
  period_end:      string;
  subtotal:        number;
  tax_rate?:       number;
  tax_amount:      number;
  credits_applied: number;
  total:           number;
  currency:        string;
  due_date:        string | null;
  paid_at:         string | null;
  notes?:          string;
  pdf_url?:        string;
  line_items?:     InvoiceLineItem[];
  created_at:      string;
  updated_at?:     string;
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export interface UsageLineItem {
  metric:      string;
  service:     string;
  description: string;
  quantity:    number;
  unit:        string;
  unit_price:  number;
  cost:        number;
}

export interface ServiceCost {
  service: string;
  cost:    number;
}

export interface CurrentUsage {
  period:      string;
  line_items:  UsageLineItem[];
  by_service:  ServiceCost[];
  total:       number;
}

// ── Billing Overview ──────────────────────────────────────────────────────────

export interface MonthTrend {
  month:  string;   // "YYYY-MM"
  amount: number;
}

export interface BillingOverview {
  account:          BillingAccount;
  current_spend:    number;
  projected:        number;
  open_balance:     number;
  credit_balance:   number;
  trend:            MonthTrend[];
  usage_breakdown:  UsageLineItem[];
}

// ── Credit Note ────────────────────────────────────────────────────────────────

export interface CreditNote {
  id:          number;
  amount:      number;
  currency:    string;
  reason:      CreditNoteReason;
  description: string;
  expires_at:  string | null;
  created_at:  string;
}
