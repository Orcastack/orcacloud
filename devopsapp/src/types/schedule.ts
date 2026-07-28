export interface ScheduleItem {
  id: string;
  owner: number;
  owner_username?: string;
  title: string;
  description?: string;
  start: string; // ISO datetime
  end?: string | null; // ISO datetime
  all_day: boolean;
  timezone?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'tentative';
  reminder_at?: string | null;
  reminder_sent?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateScheduleItem {
  title: string;
  description?: string;
  start: string;
  end?: string | null;
  all_day?: boolean;
  timezone?: string;
  status?: string;
  reminder_at?: string | null;
}

