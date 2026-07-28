import axios from 'axios';
import { ScheduleItem, CreateScheduleItem } from '../types/schedule';

const ____api = axios.create({ baseURL: '/api' });

export const scheduleService = {
  list: async (): Promise<ScheduleItem[]> => {
    const resp = await ____api.get<ScheduleItem[]>('/schedule/');
    return resp.data;
  },
  retrieve: async (id: string): Promise<ScheduleItem> => {
    const resp = await ____api.get<ScheduleItem>(`/schedule/${id}/`);
    return resp.data;
  },
  create: async (payload: CreateScheduleItem | Partial<ScheduleItem>): Promise<ScheduleItem> => {
    const resp = await ____api.post<ScheduleItem>('/schedule/', payload);
    return resp.data;
  },
  update: async (id: string, payload: Partial<CreateScheduleItem | ScheduleItem>): Promise<ScheduleItem> => {
    const resp = await ____api.put<ScheduleItem>(`/schedule/${id}/`, payload);
    return resp.data;
  },
  partialUpdate: async (id: string, payload: Partial<CreateScheduleItem | ScheduleItem>): Promise<ScheduleItem> => {
    const resp = await ____api.patch<ScheduleItem>(`/schedule/${id}/`, payload);
    return resp.data;
  },
  remove: async (id: string): Promise<void> => {
    await ____api.delete(`/schedule/${id}/`);
  },
  markReminderSent: async (id: string): Promise<void> => {
    await ____api.post(`/schedule/${id}/mark_reminder_sent/`);
  }
};

export default scheduleService;
