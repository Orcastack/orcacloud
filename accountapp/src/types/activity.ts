export interface UserActivity {
  id: string;
  user: string;
  action: string;
  timestamp: string; // ISO string
  details?: string;
}
