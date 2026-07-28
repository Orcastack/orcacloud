// OrcaCloud Enterprise – Meeting Hub
// Full 3-panel communication command centre
// Route: /enterprise/:orgSlug/meetings

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, Divider,
  Card, CardContent, Chip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Badge, Tooltip, LinearProgress, Avatar,
  List, ListItemText, ListItemButton,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTopBar from '../components/Layout/DashboardTopBar';

import AddIcon                  from '@mui/icons-material/Add';
import ArrowBackIcon             from '@mui/icons-material/ArrowBack';
import EventIcon                 from '@mui/icons-material/Event';
import MenuIcon                  from '@mui/icons-material/Menu';
import CloseIcon                 from '@mui/icons-material/Close';
import VideocamIcon              from '@mui/icons-material/Videocam';
import NotificationsIcon         from '@mui/icons-material/Notifications';
import NotificationsNoneIcon     from '@mui/icons-material/NotificationsNone';
import AnnouncementIcon          from '@mui/icons-material/Campaign';
import GroupsIcon                from '@mui/icons-material/Groups';
import CalendarMonthIcon         from '@mui/icons-material/CalendarMonth';
import ScheduleIcon              from '@mui/icons-material/Schedule';
import MeetingRoomIcon           from '@mui/icons-material/MeetingRoom';
import BarChartIcon              from '@mui/icons-material/BarChart';
import SettingsIcon              from '@mui/icons-material/Settings';
import CheckCircleIcon           from '@mui/icons-material/CheckCircle';
import CancelIcon                from '@mui/icons-material/Cancel';
import PlayCircleIcon            from '@mui/icons-material/PlayCircle';
import StopCircleIcon            from '@mui/icons-material/StopCircle';
import DeleteIcon                from '@mui/icons-material/Delete';
import ChevronLeftIcon           from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon          from '@mui/icons-material/ChevronRight';
import DoneAllIcon               from '@mui/icons-material/DoneAll';
import PushPinIcon               from '@mui/icons-material/PushPin';
import AccessTimeIcon            from '@mui/icons-material/AccessTime';
import PersonAddIcon             from '@mui/icons-material/PersonAdd';

import {
  meetingsApi, meetingNotificationsApi, announcementsApi,
  organizationApi,
  type Meeting, type MeetingAnalytics, type MeetingNotification, type Announcement,
} from '../services/enterpriseApi';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:     '#0d0f14',
  card:   '#13161d',
  card2:  '#0f1117',
  border: '#1e2330',
  text:   '#e8eaf0',
  sub:    '#6b7080',
  brand:  '#5b6aff',
  green:  '#22c55e',
  yellow: '#eab308',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#a855f7',
  orange: '#f97316',
  font:   '"Inter", "Roboto", sans-serif',
  sidebar: '#10131a',
  rightPanel: '#0f1117',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
const fmtDateTime = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`;
const isToday = (iso: string) => {
  const d = new Date(iso);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};
const isSoon = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 30 * 60 * 1000; // within 30 min
};

const statusColor = (s: string) => {
  switch (s) {
    case 'SCHEDULED':   return T.blue;
    case 'IN_PROGRESS': return T.green;
    case 'COMPLETED':   return T.sub;
    case 'CANCELLED':   return T.red;
    default:            return T.sub;
  }
};
const priorityColor = (p: string) => {
  switch (p) {
    case 'urgent': return T.red;
    case 'high':   return T.orange;
    case 'normal': return T.brand;
    default:       return T.sub;
  }
};

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ meetings, onDayClick }: { meetings: Meeting[]; onDayClick: (d: Date) => void }) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const meetingDates = useMemo(() => {
    const s = new Set<string>();
    meetings.forEach(m => {
      const d = new Date(m.start_time);
      if (d.getFullYear() === year && d.getMonth() === month)
        s.add(d.getDate().toString());
    });
    return s;
  }, [meetings, year, month]);

  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

  const prev = () => setCursor(new Date(year, month - 1, 1));
  const next = () => setCursor(new Date(year, month + 1, 1));

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <IconButton size="small" onClick={prev} sx={{ color: T.sub, p: 0.5 }}><ChevronLeftIcon sx={{ fontSize: '1rem' }} /></IconButton>
        <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.82rem' }}>
          {monthNames[month]} {year}
        </Typography>
        <IconButton size="small" onClick={next} sx={{ color: T.sub, p: 0.5 }}><ChevronRightIcon sx={{ fontSize: '1rem' }} /></IconButton>
      </Box>
      {/* Day names */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', mb: 0.5 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <Typography key={i} sx={{ color: T.sub, fontSize: '.68rem', textAlign: 'center', fontWeight: 600 }}>{d}</Typography>
        ))}
      </Box>
      {/* Days */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0.3 }}>
        {Array.from({ length: firstDow }).map((_, i) => <Box key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const hasMeeting = meetingDates.has(day.toString());
          const today = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
          const isSelected = selected?.getDate() === day && selected?.getMonth() === month;
          return (
            <Box
              key={day}
              onClick={() => {
                const d = new Date(year, month, day);
                setSelected(d);
                onDayClick(d);
              }}
              sx={{
                textAlign: 'center', cursor: 'pointer', borderRadius: 1, py: 0.3,
                position: 'relative',
                bgcolor: isSelected ? T.brand : today ? `${T.brand}25` : 'transparent',
                '&:hover': { bgcolor: isSelected ? T.brand : `${T.brand}18` },
              }}
            >
              <Typography sx={{
                fontSize: '.72rem', fontWeight: today || isSelected ? 700 : 400,
                color: isSelected ? '#fff' : today ? T.brand : T.text,
              }}>{day}</Typography>
              {hasMeeting && !isSelected && (
                <Box sx={{
                  width: 4, height: 4, borderRadius: '50%',
                  bgcolor: T.brand, mx: 'auto', mt: '-2px',
                }} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Create Meeting Dialog ─────────────────────────────────────────────────────
interface CreateMeetingForm {
  title: string;
  description: string;
  agenda: string;
  start_time: string;
  end_time: string;
  meeting_type: string;
  video_provider: string;
  video_join_url: string;
  location: string;
  is_recurring: boolean;
}
const EMPTY_FORM: CreateMeetingForm = {
  title: '', description: '', agenda: '',
  start_time: '', end_time: '',
  meeting_type: 'scheduled', video_provider: 'livekit',
  video_join_url: '', location: '', is_recurring: false,
};

function CreateMeetingDialog({
  open, orgId, onClose, onCreated,
}: { open: boolean; orgId: string; onClose: () => void; onCreated: (m: Meeting) => void }) {
  const [form, setForm] = useState<CreateMeetingForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof CreateMeetingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title || !form.start_time || !form.end_time) {
      setErr('Title, start time and end time are required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const m = await meetingsApi.create(orgId, {
        ...form,
        meeting_type: form.meeting_type as any,
      });
      onCreated(m);
      setForm(EMPTY_FORM);
    } catch {
      setErr('Failed to create meeting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fieldSx = {
    '& .MuiInputBase-root': { bgcolor: T.card2, color: T.text, fontSize: '.88rem' },
    '& .MuiInputLabel-root': { color: T.sub },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: T.border },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.brand },
    mb: 2,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 3 } }}>
      <DialogTitle sx={{ color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <EventIcon sx={{ color: T.brand }} /> Schedule a Meeting
        <IconButton onClick={onClose} size="small" sx={{ ml: 'auto', color: T.sub }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {err && <Alert severity="error" sx={{ mb: 2, fontSize: '.82rem' }}>{err}</Alert>}
        <TextField fullWidth label="Meeting Title" value={form.title} onChange={set('title')} sx={fieldSx} />
        <TextField fullWidth label="Description" multiline rows={2} value={form.description} onChange={set('description')} sx={fieldSx} />
        <TextField fullWidth label="Agenda" multiline rows={2} value={form.agenda} onChange={set('agenda')} sx={fieldSx} placeholder="Paste meeting agenda here…" />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField fullWidth label="Start Time" type="datetime-local" value={form.start_time}
            onChange={set('start_time')} InputLabelProps={{ shrink: true }} sx={fieldSx} />
          <TextField fullWidth label="End Time" type="datetime-local" value={form.end_time}
            onChange={set('end_time')} InputLabelProps={{ shrink: true }} sx={fieldSx} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel sx={{ color: T.sub }}>Type</InputLabel>
            <Select value={form.meeting_type} label="Type" onChange={e => setForm(f => ({ ...f, meeting_type: e.target.value }))}
              sx={{ color: T.text }}>
              {[['scheduled','Scheduled'],['recurring','Recurring'],['instant','Instant'],['department','Department']].map(([v,l]) =>
                <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel sx={{ color: T.sub }}>Video Provider</InputLabel>
            <Select value={form.video_provider} label="Video Provider" onChange={e => setForm(f => ({ ...f, video_provider: e.target.value }))}
              sx={{ color: T.text }}>
              {[['livekit','LiveKit'],['daily','Daily.co'],['twilio','Twilio Video'],['webrtc','Custom WebRTC']].map(([v,l]) =>
                <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
        <TextField fullWidth label="Video Join URL (optional)" value={form.video_join_url}
          onChange={set('video_join_url')} sx={fieldSx} placeholder="https://meet.yourplatform.com/room-id" />
        <TextField fullWidth label="Location (optional)" value={form.location}
          onChange={set('location')} sx={fieldSx} placeholder="Conference Room A / Remote" />
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0.5 }}>
        <Button onClick={onClose} sx={{ color: T.sub, textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} disabled={saving} variant="contained"
          sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: T.brand }, minWidth: 130 }}>
          {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Create Meeting'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Announcement Dialog ───────────────────────────────────────────────────────
function AnnouncementDialog({
  open, orgId, onClose, onCreated,
}: { open: boolean; orgId: string; onClose: () => void; onCreated: (a: Announcement) => void }) {
  const [title, setTitle]       = useState('');
  const [message, setMessage]   = useState('');
  const [priority, setPriority] = useState('normal');
  const [pinned, setPinned]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  const submit = async () => {
    if (!title || !message) { setErr('Title and message are required.'); return; }
    setSaving(true); setErr('');
    try {
      const a = await announcementsApi.create(orgId, {
        title, message, priority: priority as any, is_pinned: pinned,
      });
      onCreated(a);
      setTitle(''); setMessage(''); setPriority('normal'); setPinned(false);
    } catch {
      setErr('Failed to post announcement.');
    } finally { setSaving(false); }
  };

  const fieldSx = {
    '& .MuiInputBase-root': { bgcolor: T.card2, color: T.text, fontSize: '.88rem' },
    '& .MuiInputLabel-root': { color: T.sub },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: T.border },
    mb: 2,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 3 } }}>
      <DialogTitle sx={{ color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AnnouncementIcon sx={{ color: T.orange }} /> Post Announcement
        <IconButton onClick={onClose} size="small" sx={{ ml: 'auto', color: T.sub }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <TextField fullWidth label="Title" value={title} onChange={e => setTitle(e.target.value)} sx={fieldSx} />
        <TextField fullWidth label="Message" multiline rows={4} value={message} onChange={e => setMessage(e.target.value)} sx={fieldSx} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel sx={{ color: T.sub }}>Priority</InputLabel>
            <Select value={priority} label="Priority" onChange={e => setPriority(e.target.value)} sx={{ color: T.text }}>
              {[['low','Low'],['normal','Normal'],['high','High'],['urgent','Urgent']].map(([v,l]) =>
                <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Button
              variant={pinned ? 'contained' : 'outlined'}
              size="small"
              startIcon={<PushPinIcon />}
              onClick={() => setPinned(p => !p)}
              sx={{ textTransform: 'none', borderColor: T.border, color: pinned ? '#fff' : T.sub,
                    bgcolor: pinned ? T.brand : 'transparent', whiteSpace: 'nowrap' }}>
              {pinned ? 'Pinned' : 'Pin it'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: T.sub, textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} disabled={saving} variant="contained"
          sx={{ bgcolor: T.orange, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: T.orange } }}>
          {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Post Announcement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Meeting Card ──────────────────────────────────────────────────────────────
function MeetingCard({ meeting, orgId, onStart, onEnd, onDelete }: {
  meeting: Meeting;
  orgId: string;
  onStart: (m: Meeting) => void;
  onEnd: (m: Meeting) => void;
  onDelete: (id: string) => void;
}) {
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const handleRSVP = async (status: 'accepted' | 'declined') => {
    setRsvpLoading(true);
    try { await meetingsApi.rsvp(orgId, meeting.id, status); }
    catch { /* ignore */ }
    finally { setRsvpLoading(false); }
  };

  const today = isToday(meeting.start_time);
  const soon  = isSoon(meeting.start_time);

  return (
    <Card sx={{
      bgcolor: T.card, border: `1px solid ${soon ? T.brand : T.border}`,
      borderRadius: 2, mb: 1.5,
      boxShadow: soon ? `0 0 0 1px ${T.brand}50` : 'none',
      transition: 'border-color .2s',
    }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Icon */}
          <Box sx={{
            bgcolor: `${statusColor(meeting.status)}18`,
            borderRadius: 1.5, p: 1, display: 'flex',
            color: statusColor(meeting.status), flexShrink: 0, mt: 0.25,
          }}>
            {meeting.status === 'IN_PROGRESS' ? <VideocamIcon sx={{ fontSize: '1.2rem' }} /> : <EventIcon sx={{ fontSize: '1.2rem' }} />}
          </Box>

          {/* Main info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>
                {meeting.title}
              </Typography>
              {today && <Chip label="Today" size="small" sx={{ bgcolor: `${T.brand}20`, color: T.brand, fontSize: '.68rem', height: 18 }} />}
              {soon && <Chip label="Starting soon" size="small" sx={{ bgcolor: `${T.orange}20`, color: T.orange, fontSize: '.68rem', height: 18 }} />}
              {meeting.is_recurring && <Chip label="Recurring" size="small" sx={{ bgcolor: `${T.purple}18`, color: T.purple, fontSize: '.68rem', height: 18 }} />}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
              <Typography sx={{ color: T.sub, fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: '.85rem' }} />
                {fmtDateTime(meeting.start_time)} – {fmtTime(meeting.end_time)}
                &nbsp;·&nbsp; {meeting.duration_minutes} min
              </Typography>
              <Typography sx={{ color: T.sub, fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GroupsIcon sx={{ fontSize: '.85rem' }} />
                {meeting.participant_count} attendee{meeting.participant_count !== 1 ? 's' : ''}
              </Typography>
              {meeting.video_provider && (
                <Typography sx={{ color: T.sub, fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <VideocamIcon sx={{ fontSize: '.85rem' }} />
                  {meeting.video_provider}
                </Typography>
              )}
              {meeting.location && (
                <Typography sx={{ color: T.sub, fontSize: '.78rem' }}>
                  📍 {meeting.location}
                </Typography>
              )}
            </Box>

            {meeting.description && (
              <Typography sx={{ color: T.sub, fontSize: '.78rem', mt: 0.5, lineHeight: 1.5 }}
                noWrap>{meeting.description}</Typography>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Chip
              label={meeting.status.replace('_', ' ')}
              size="small"
              sx={{ bgcolor: `${statusColor(meeting.status)}18`, color: statusColor(meeting.status), fontSize: '.72rem', fontWeight: 700 }}
            />

            {meeting.status === 'SCHEDULED' && (
              <>
                <Tooltip title="Accept invite">
                  <IconButton size="small" disabled={rsvpLoading} onClick={() => handleRSVP('accepted')}
                    sx={{ color: T.green, bgcolor: `${T.green}12`, '&:hover': { bgcolor: `${T.green}25` } }}>
                    <CheckCircleIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Decline invite">
                  <IconButton size="small" disabled={rsvpLoading} onClick={() => handleRSVP('declined')}
                    sx={{ color: T.red, bgcolor: `${T.red}12`, '&:hover': { bgcolor: `${T.red}25` } }}>
                    <CancelIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>
                <Button
                  size="small" variant="contained"
                  startIcon={<PlayCircleIcon />}
                  onClick={() => onStart(meeting)}
                  sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, fontSize: '.78rem',
                        '&:hover': { bgcolor: T.brand }, minWidth: 0 }}>
                  Start
                </Button>
              </>
            )}

            {meeting.status === 'IN_PROGRESS' && (
              <>
                <Button
                  size="small" variant="contained"
                  startIcon={<VideocamIcon />}
                  href={meeting.video_join_url || '#'}
                  target="_blank"
                  sx={{ bgcolor: T.green, textTransform: 'none', fontWeight: 700, fontSize: '.78rem',
                        '&:hover': { bgcolor: T.green }, minWidth: 0 }}>
                  Join
                </Button>
                <Button
                  size="small" variant="outlined"
                  startIcon={<StopCircleIcon />}
                  onClick={() => onEnd(meeting)}
                  sx={{ borderColor: T.red, color: T.red, textTransform: 'none', fontWeight: 700, fontSize: '.78rem',
                        '&:hover': { borderColor: T.red, bgcolor: `${T.red}12` }, minWidth: 0 }}>
                  End
                </Button>
              </>
            )}

            {(meeting.status === 'SCHEDULED' || meeting.status === 'IN_PROGRESS') && (
              <Tooltip title="Delete meeting">
                <IconButton size="small" onClick={() => onDelete(meeting.id)}
                  sx={{ color: T.sub, '&:hover': { color: T.red } }}>
                  <DeleteIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const EnterpriseMeetingsPage: React.FC = () => {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();

  // layout state
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [rightOpen,    setRightOpen]    = useState(true);
  const [activeSection, setActiveSection] = useState<'upcoming' | 'all' | 'completed' | 'cancelled'>('upcoming');

  // dialog state
  const [createOpen, setCreateOpen]       = useState(false);
  const [announceOpen, setAnnounceOpen]   = useState(false);

  // data state
  const [meetings,       setMeetings]       = useState<Meeting[]>([]);
  const [analytics,      setAnalytics]      = useState<MeetingAnalytics | null>(null);
  const [notifications,  setNotifications]  = useState<MeetingNotification[]>([]);
  const [announcements,  setAnnouncements]  = useState<Announcement[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');

  // org ID resolution
  const [orgId, setOrgId] = useState('');
  useEffect(() => {
    organizationApi.getBySlug(orgSlug).then(o => setOrgId(o.id)).catch(() => {});
  }, [orgSlug]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [mtgs, anal, notifs, anns] = await Promise.all([
        meetingsApi.list(orgId),
        meetingsApi.analytics(orgId).catch(() => null),
        meetingNotificationsApi.list(orgId).catch(() => [] as MeetingNotification[]),
        announcementsApi.list(orgId).catch(() => [] as Announcement[]),
      ]);
      setMeetings(Array.isArray(mtgs) ? mtgs : []);
      setAnalytics(anal || null);
      setNotifications(Array.isArray(notifs) ? notifs : []);
      setAnnouncements(Array.isArray(anns) ? anns : []);
    } catch {
      setError('Failed to load Meeting Hub. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // filtered meetings
  const filteredMeetings = useMemo(() => {
    const now = new Date();
    switch (activeSection) {
      case 'upcoming':
        return meetings.filter(m => new Date(m.start_time) >= now && m.status !== 'CANCELLED');
      case 'completed':
        return meetings.filter(m => m.status === 'COMPLETED');
      case 'cancelled':
        return meetings.filter(m => m.status === 'CANCELLED');
      default:
        return meetings;
    }
  }, [meetings, activeSection]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const inProgressCount = meetings.filter(m => m.status === 'IN_PROGRESS').length;

  const handleStart = async (m: Meeting) => {
    try {
      await meetingsApi.start(orgId, m.id);
      setMeetings(prev => prev.map(x => x.id === m.id ? { ...x, status: 'IN_PROGRESS' } : x));
    } catch { /* ignore */ }
  };

  const handleEnd = async (m: Meeting) => {
    try {
      await meetingsApi.end(orgId, m.id);
      setMeetings(prev => prev.map(x => x.id === m.id ? { ...x, status: 'COMPLETED' } : x));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await meetingsApi.delete(orgId, id);
      setMeetings(prev => prev.filter(m => m.id !== id));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await meetingNotificationsApi.markAllRead(orgId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  const statCards = analytics ? [
    { label: 'This Week',    value: analytics.this_week,    color: T.brand,  icon: CalendarMonthIcon },
    { label: 'This Month',   value: analytics.this_month,   color: T.blue,   icon: EventIcon },
    { label: 'Upcoming',     value: analytics.upcoming,     color: T.green,  icon: ScheduleIcon },
    { label: 'Avg Duration', value: `${analytics.avg_duration}m`, color: T.purple, icon: AccessTimeIcon },
  ] : [];

  const sidebarSections = [
    { id: 'upcoming',  label: 'Upcoming',     icon: ScheduleIcon,    count: meetings.filter(m => m.status === 'SCHEDULED').length },
    { id: 'all',       label: 'All Meetings', icon: CalendarMonthIcon, count: meetings.length },
    { id: 'completed', label: 'Completed',    icon: CheckCircleIcon, count: meetings.filter(m => m.status === 'COMPLETED').length },
    { id: 'cancelled', label: 'Cancelled',    icon: CancelIcon,      count: meetings.filter(m => m.status === 'CANCELLED').length },
  ];

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: T.bg, fontFamily: T.font, flexDirection: 'column' }}>

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <DashboardTopBar
        routeBase={`/enterprise/${orgSlug}/overview`}
        leftContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => setSidebarOpen(s => !s)}
              sx={{ color: T.sub, '&:hover': { color: T.text } }}>
              <MenuIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
            <EventIcon sx={{ color: T.brand, fontSize: '1.1rem' }} />
            <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.93rem' }}>Meeting Hub</Typography>
            {inProgressCount > 0 && (
              <Chip label={`${inProgressCount} live`} size="small"
                sx={{ bgcolor: `${T.green}20`, color: T.green, fontWeight: 700, fontSize: '.7rem', height: 20, animation: 'pulse 2s infinite' }} />
            )}
          </Box>
        }
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button size="small" variant="outlined" startIcon={<AnnouncementIcon />}
              onClick={() => setAnnounceOpen(true)}
              sx={{ color: T.orange, borderColor: T.orange, textTransform: 'none', fontSize: '.78rem',
                    '&:hover': { borderColor: T.orange, bgcolor: `${T.orange}12` } }}>
              Announce
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, fontSize: '.78rem',
                    '&:hover': { bgcolor: T.brand } }}>
              Schedule
            </Button>
            <IconButton size="small" onClick={() => setRightOpen(r => !r)}
              sx={{ color: T.sub, '&:hover': { color: T.text } }}>
              <Badge badgeContent={unreadCount} color="error" max={9}>
                <NotificationsNoneIcon sx={{ fontSize: '1.1rem' }} />
              </Badge>
            </IconButton>
          </Box>
        }
      />

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        {sidebarOpen && (
          <Box sx={{
            width: 230, flexShrink: 0,
            bgcolor: T.sidebar, borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Back nav */}
            <Box
              onClick={() => navigate(`/enterprise/${orgSlug}/workspace`)}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: 2, cursor: 'pointer',
                    color: T.sub, '&:hover': { color: T.brand }, transition: 'color .15s' }}>
              <ArrowBackIcon sx={{ fontSize: '.9rem' }} />
              <Typography sx={{ fontSize: '.8rem', fontWeight: 500 }}>Back to Workspace</Typography>
            </Box>
            <Divider sx={{ borderColor: T.border }} />

            {/* Mini Calendar */}
            <MiniCalendar meetings={meetings} onDayClick={(d) => {
              setActiveSection('all');
            }} />

            <Divider sx={{ borderColor: T.border }} />

            {/* Nav sections */}
            <Box sx={{ p: 1 }}>
              <Typography sx={{ color: T.sub, fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', px: 1, pt: 1.5, pb: 0.5 }}>
                Meetings
              </Typography>
              {sidebarSections.map(sec => {
                const Icon = sec.icon;
                const active = activeSection === sec.id;
                return (
                  <ListItemButton key={sec.id} onClick={() => setActiveSection(sec.id as any)}
                    sx={{
                      borderRadius: 1.5, mb: 0.25, py: 0.75, px: 1.5,
                      bgcolor: active ? `${T.brand}18` : 'transparent',
                      '&:hover': { bgcolor: active ? `${T.brand}25` : `${T.brand}10` },
                    }}>
                    <Icon sx={{ fontSize: '1rem', color: active ? T.brand : T.sub, mr: 1 }} />
                    <Typography sx={{ color: active ? T.brand : T.text, fontSize: '.83rem', fontWeight: active ? 700 : 400, flex: 1 }}>
                      {sec.label}
                    </Typography>
                    {sec.count > 0 && (
                      <Typography sx={{ color: active ? T.brand : T.sub, fontSize: '.72rem', fontWeight: 600 }}>
                        {sec.count}
                      </Typography>
                    )}
                  </ListItemButton>
                );
              })}
            </Box>

            <Divider sx={{ borderColor: T.border }} />

            <Box sx={{ p: 1 }}>
              <Typography sx={{ color: T.sub, fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', px: 1, pt: 1.5, pb: 0.5 }}>
                Tools
              </Typography>
              {[
                { label: 'Meeting Rooms', icon: MeetingRoomIcon, comingSoon: true },
                { label: 'Analytics',     icon: BarChartIcon,    comingSoon: false },
                { label: 'Departments',   icon: GroupsIcon,      comingSoon: true },
                { label: 'Settings',      icon: SettingsIcon,    comingSoon: true },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <ListItemButton key={item.label}
                    sx={{ borderRadius: 1.5, mb: 0.25, py: 0.75, px: 1.5, '&:hover': { bgcolor: `${T.brand}10` } }}>
                    <Icon sx={{ fontSize: '1rem', color: T.sub, mr: 1 }} />
                    <Typography sx={{ color: T.sub, fontSize: '.83rem', flex: 1 }}>{item.label}</Typography>
                    {item.comingSoon && (
                      <Chip label="soon" size="small" sx={{ bgcolor: T.card2, color: T.sub, fontSize: '.62rem', height: 16 }} />
                    )}
                  </ListItemButton>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ── CENTER PANEL ─────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress sx={{ color: T.brand }} />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              {/* Stats */}
              {analytics && (
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  {statCards.map(s => {
                    const Icon = s.icon;
                    return (
                      <Box key={s.label} sx={{
                        flex: 1, minWidth: 130,
                        bgcolor: T.card, border: `1px solid ${T.border}`,
                        borderRadius: 2, p: 2, textAlign: 'center',
                      }}>
                        <Icon sx={{ color: s.color, fontSize: '1.5rem', mb: 0.5 }} />
                        <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>
                          {s.value}
                        </Typography>
                        <Typography sx={{ color: T.sub, fontSize: '.78rem', mt: 0.25 }}>{s.label}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* In-progress banner */}
              {meetings.filter(m => m.status === 'IN_PROGRESS').map(m => (
                <Box key={m.id} sx={{
                  bgcolor: `${T.green}15`, border: `1px solid ${T.green}50`,
                  borderRadius: 2, p: 2, mb: 2,
                  display: 'flex', alignItems: 'center', gap: 2,
                }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%', bgcolor: T.green,
                    animation: 'pulse 1.5s infinite',
                  }} />
                  <Typography sx={{ color: T.green, fontWeight: 700, flex: 1 }}>
                    🔴 Live: {m.title}
                  </Typography>
                  <Button
                    href={m.video_join_url || '#'} target="_blank"
                    variant="contained" size="small"
                    startIcon={<VideocamIcon />}
                    sx={{ bgcolor: T.green, textTransform: 'none', fontWeight: 700,
                          '&:hover': { bgcolor: T.green }, fontSize: '.8rem' }}>
                    Join Now
                  </Button>
                  <Button
                    onClick={() => handleEnd(m)}
                    variant="outlined" size="small"
                    sx={{ borderColor: T.red, color: T.red, textTransform: 'none', fontSize: '.8rem',
                          '&:hover': { bgcolor: `${T.red}12`, borderColor: T.red } }}>
                    End
                  </Button>
                </Box>
              ))}

              {/* Section toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.05rem' }}>
                  {activeSection === 'upcoming' ? 'Upcoming Meetings'
                    : activeSection === 'all' ? 'All Meetings'
                    : activeSection === 'completed' ? 'Completed Meetings'
                    : 'Cancelled Meetings'}
                  <Typography component="span" sx={{ color: T.sub, fontWeight: 400, ml: 1, fontSize: '.85rem' }}>
                    ({filteredMeetings.length})
                  </Typography>
                </Typography>
                <Button size="small" startIcon={<AddIcon />} variant="contained"
                  onClick={() => setCreateOpen(true)}
                  sx={{ bgcolor: T.brand, textTransform: 'none', fontWeight: 700, fontSize: '.78rem',
                        '&:hover': { bgcolor: T.brand } }}>
                  New Meeting
                </Button>
              </Box>

              {filteredMeetings.length === 0 ? (
                <Card sx={{ bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2 }}>
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <EventIcon sx={{ color: T.sub, fontSize: '2.5rem', mb: 1, opacity: 0.35 }} />
                    <Typography sx={{ color: T.sub, fontSize: '.9rem' }}>
                      {activeSection === 'upcoming'
                        ? 'No upcoming meetings scheduled. Click "New Meeting" to get started.'
                        : 'No meetings found in this category.'}
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                filteredMeetings.map(m => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    orgId={orgId}
                    onStart={handleStart}
                    onEnd={handleEnd}
                    onDelete={handleDelete}
                  />
                ))
              )}

              {/* Analytics Section */}
              {analytics && (
                <Box sx={{ mt: 4 }}>
                  <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.05rem', mb: 2 }}>
                    Meeting Analytics
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Total Meetings',  value: analytics.total,     color: T.brand },
                      { label: 'Completed',        value: analytics.completed, color: T.green },
                      { label: 'In Progress',      value: analytics.in_progress, color: T.orange },
                      { label: 'Avg Duration',     value: `${analytics.avg_duration} min`, color: T.purple },
                    ].map(s => (
                      <Card key={s.label} sx={{
                        flex: 1, minWidth: 130,
                        bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2, p: 2,
                      }}>
                        <Typography sx={{ color: T.sub, fontSize: '.75rem', mb: 0.5 }}>{s.label}</Typography>
                        <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.5rem' }}>{s.value}</Typography>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        {rightOpen && (
          <Box sx={{
            width: 290, flexShrink: 0,
            bgcolor: T.rightPanel, borderLeft: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Notifications */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${T.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.88rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Badge badgeContent={unreadCount} color="error" max={9}>
                    <NotificationsIcon sx={{ fontSize: '1rem', color: T.brand }} />
                  </Badge>
                  &nbsp; Notifications
                </Typography>
                {unreadCount > 0 && (
                  <Tooltip title="Mark all read">
                    <IconButton size="small" onClick={handleMarkAllRead} sx={{ color: T.sub, '&:hover': { color: T.brand } }}>
                      <DoneAllIcon sx={{ fontSize: '.9rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {notifications.length === 0 ? (
                <Typography sx={{ color: T.sub, fontSize: '.8rem', textAlign: 'center', py: 2 }}>
                  No notifications
                </Typography>
              ) : (
                notifications.slice(0, 8).map(n => (
                  <Box key={n.id} sx={{
                    p: 1.5, mb: 1, borderRadius: 1.5,
                    bgcolor: n.is_read ? 'transparent' : `${T.brand}10`,
                    border: `1px solid ${n.is_read ? T.border : T.brand + '30'}`,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: `${T.brand}15` },
                  }}>
                    <Typography sx={{ color: T.text, fontWeight: n.is_read ? 400 : 700, fontSize: '.8rem', mb: 0.25 }}>
                      {n.meeting_title}
                    </Typography>
                    <Typography sx={{ color: T.sub, fontSize: '.73rem' }}>
                      {n.message || n.notif_type.replace('_', ' ')}
                    </Typography>
                    <Typography sx={{ color: T.sub, fontSize: '.7rem', mt: 0.25 }}>
                      {fmtDateTime(n.sent_at)}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>

            {/* Announcements */}
            <Box sx={{ p: 2, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.88rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <AnnouncementIcon sx={{ fontSize: '1rem', color: T.orange }} />
                  &nbsp; Announcements
                </Typography>
                <Tooltip title="Post announcement">
                  <IconButton size="small" onClick={() => setAnnounceOpen(true)}
                    sx={{ color: T.sub, '&:hover': { color: T.orange } }}>
                    <AddIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {announcements.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <AnnouncementIcon sx={{ color: T.sub, fontSize: '2rem', opacity: 0.3 }} />
                  <Typography sx={{ color: T.sub, fontSize: '.8rem', mt: 1 }}>No announcements yet</Typography>
                  <Button size="small" onClick={() => setAnnounceOpen(true)}
                    sx={{ color: T.orange, textTransform: 'none', fontSize: '.78rem', mt: 0.5 }}>
                    Post one
                  </Button>
                </Box>
              ) : (
                announcements.map(a => (
                  <Box key={a.id} sx={{
                    p: 1.5, mb: 1.5, borderRadius: 1.5,
                    border: `1px solid ${a.is_pinned ? priorityColor(a.priority) + '60' : T.border}`,
                    bgcolor: a.is_pinned ? `${priorityColor(a.priority)}08` : 'transparent',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      {a.is_pinned && <PushPinIcon sx={{ fontSize: '.8rem', color: priorityColor(a.priority) }} />}
                      <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.82rem', flex: 1 }}>
                        {a.title}
                      </Typography>
                      <Chip label={a.priority} size="small"
                        sx={{ bgcolor: `${priorityColor(a.priority)}18`, color: priorityColor(a.priority),
                              fontSize: '.65rem', height: 16, fontWeight: 700 }} />
                    </Box>
                    <Typography sx={{ color: T.sub, fontSize: '.78rem', lineHeight: 1.5 }}>
                      {a.message.length > 100 ? a.message.slice(0, 100) + '…' : a.message}
                    </Typography>
                    <Typography sx={{ color: T.sub, fontSize: '.7rem', mt: 0.5 }}>
                      {a.created_by_name} · {a.department_name} · {fmtDate(a.created_at)}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>

            {/* Upcoming reminders */}
            <Box sx={{ p: 2, borderTop: `1px solid ${T.border}` }}>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.88rem', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ScheduleIcon sx={{ fontSize: '1rem', color: T.blue }} />
                &nbsp; Reminders
              </Typography>
              {meetings
                .filter(m => m.status === 'SCHEDULED' && new Date(m.start_time) > new Date())
                .slice(0, 3)
                .map(m => (
                  <Box key={m.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25,
                    p: 1.25, borderRadius: 1.5, bgcolor: T.card2, border: `1px solid ${T.border}`,
                  }}>
                    <Box sx={{ bgcolor: `${T.blue}20`, borderRadius: 1, p: 0.75, color: T.blue, display: 'flex' }}>
                      <EventIcon sx={{ fontSize: '.9rem' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.78rem' }} noWrap>
                        {m.title}
                      </Typography>
                      <Typography sx={{ color: T.sub, fontSize: '.7rem' }}>
                        {fmtDate(m.start_time)} at {fmtTime(m.start_time)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              {meetings.filter(m => m.status === 'SCHEDULED' && new Date(m.start_time) > new Date()).length === 0 && (
                <Typography sx={{ color: T.sub, fontSize: '.78rem', textAlign: 'center', py: 1 }}>
                  No upcoming reminders
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <CreateMeetingDialog
        open={createOpen}
        orgId={orgId}
        onClose={() => setCreateOpen(false)}
        onCreated={m => {
          setMeetings(prev => [m, ...prev]);
          setCreateOpen(false);
        }}
      />
      <AnnouncementDialog
        open={announceOpen}
        orgId={orgId}
        onClose={() => setAnnounceOpen(false)}
        onCreated={a => {
          setAnnouncements(prev => [a, ...prev]);
          setAnnounceOpen(false);
        }}
      />
    </Box>
  );
};

export default EnterpriseMeetingsPage;
