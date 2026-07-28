// OrcaCloud – Email Marketing Types

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'error';
export type CampaignType   = 'regular' | 'ab_test' | 'automated' | 'rss';
export type ContactStatus  = 'subscribed' | 'unsubscribed' | 'bounced' | 'complained' | 'pending';
export type TemplateCategory = 'newsletter' | 'promotional' | 'transactional' | 'welcome' | 'announcement' | 'custom';
export type AutomationTrigger = 'subscribe' | 'unsubscribe' | 'date_field' | 'campaign_open' | 'campaign_click' | 'manual';

export interface CampaignAnalytics {
  total_sent:       number;
  delivered:        number;
  bounced:          number;
  hard_bounces:     number;
  soft_bounces:     number;
  opens:            number;
  unique_opens:     number;
  clicks:           number;
  unique_clicks:    number;
  unsubscribes:     number;
  complaints:       number;
  link_clicks:      Record<string, number>;
  last_synced_at:   string | null;
  open_rate:        number;
  click_rate:       number;
  bounce_rate:      number;
  unsubscribe_rate: number;
}

export interface Campaign {
  resource_id:    string;
  name:           string;
  description:    string;
  status:         CampaignStatus;
  campaign_type:  CampaignType;
  from_name:      string;
  from_email:     string;
  reply_to:       string;
  subject:        string;
  preview_text:   string;
  template:       EmailTemplate | null;
  html_body:      string;
  text_body:      string;
  contact_lists:  ContactList[];
  scheduled_at:   string | null;
  sent_at:        string | null;
  track_opens:    boolean;
  track_clicks:   boolean;
  google_analytics: boolean;
  utm_source:     string;
  utm_medium:     string;
  utm_campaign:   string;
  created_at:     string;
  updated_at:     string;
  analytics?:     CampaignAnalytics | null;
}

export interface ContactList {
  resource_id:       string;
  name:              string;
  description:       string;
  status:            'active' | 'archived';
  double_optin:      boolean;
  subscriber_count:  number;
  created_at:        string;
  updated_at:        string;
}

export interface Contact {
  id:              number;
  contact_list_id: string;
  email:           string;
  first_name:      string;
  last_name:       string;
  status:          ContactStatus;
  custom_fields:   Record<string, string>;
  tags:            string[];
  subscribed_at:   string | null;
  unsubscribed_at: string | null;
  ip_address:      string;
  created_at:      string;
  updated_at:      string;
}

export interface EmailTemplate {
  resource_id:  string;
  name:         string;
  description:  string;
  category:     TemplateCategory;
  subject:      string;
  preview_text: string;
  html_body:    string;
  text_body:    string;
  thumbnail_url: string;
  is_active:    boolean;
  variables:    string[];
  created_at:   string;
  updated_at:   string;
}

export interface AutomationStep {
  delay_days: number;
  subject:    string;
  html_body:  string;
  from_email: string;
}

export interface Automation {
  resource_id:     string;
  name:            string;
  description:     string;
  trigger:         AutomationTrigger;
  contact_list_id: string;
  is_active:       boolean;
  steps:           AutomationStep[];
  created_at:      string;
  updated_at:      string;
}

export interface AccountStats {
  campaigns:          number;
  sent_campaigns:     number;
  draft_campaigns:    number;
  contact_lists:      number;
  total_contacts:     number;
  total_sent:         number;
  avg_open_rate:      number;
  avg_click_rate:     number;
  avg_bounce_rate:    number;
  total_unsubscribes: number;
}

export interface MarketingQuickAction {
  label: string;
  route: string;
}

export interface MarketingOverviewResponse {
  top_metrics: {
    total_campaigns: number;
    active_campaigns: number;
    audience_size: number;
    monthly_spend: number;
    overall_roi: number;
    seo_score: number;
    deliverability_score: number;
    avg_engagement_rate: number;
  };
  live_activity: {
    running_campaigns: Array<{ id: string; name: string; channel: string }>;
    active_experiments: Array<{ id: string; name: string }>;
    upcoming_content: Array<{ id: string; title: string; scheduled_at: string | null }>;
  };
  insights: {
    best_channel: string;
    best_segment: string;
    seo_opportunities: string[];
    ai_recommendations: string[];
  };
  quick_actions: MarketingQuickAction[];
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateCampaignPayload {
  name:              string;
  description?:      string;
  campaign_type?:    CampaignType;
  from_name:         string;
  from_email:        string;
  reply_to?:         string;
  subject:           string;
  preview_text?:     string;
  template_id?:      string;
  html_body?:        string;
  text_body?:        string;
  contact_list_ids?: string[];
  scheduled_at?:     string;
  track_opens?:      boolean;
  track_clicks?:     boolean;
  utm_source?:       string;
  utm_medium?:       string;
  utm_campaign?:     string;
}

export interface CreateContactListPayload {
  name:         string;
  description?: string;
  double_optin?: boolean;
}

export interface CreateContactPayload {
  contact_list_id: string;
  email:           string;
  first_name?:     string;
  last_name?:      string;
  custom_fields?:  Record<string, string>;
  tags?:           string[];
}

export interface CreateTemplatePayload {
  name:          string;
  description?:  string;
  category?:     TemplateCategory;
  subject:       string;
  preview_text?: string;
  html_body:     string;
  text_body?:    string;
  thumbnail_url?: string;
  variables?:    string[];
}

export interface CreateAutomationPayload {
  name:              string;
  description?:      string;
  trigger:           AutomationTrigger;
  contact_list_id?:  string;
  steps:             AutomationStep[];
}
