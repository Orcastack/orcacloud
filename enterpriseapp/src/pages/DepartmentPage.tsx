/**
 * DepartmentPage – Full-featured per-department page with customisable sidebar.
 *
 * The sidebar is data-driven via the DepartmentSidebarItem API. If the API
 * returns an empty list the component seeds sensible defaults locally and
 * persists them when the user saves the sidebar editor.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, AvatarGroup, Box, Button, Chip, CircularProgress, Collapse,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton,
  InputAdornment, LinearProgress, MenuItem, Paper, Select, Stack, Switch,
  TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import ArrowBackIcon        from '@mui/icons-material/ArrowBack';
import ArticleIcon          from '@mui/icons-material/Article';
import AssignmentIcon       from '@mui/icons-material/Assignment';
import BadgeIcon            from '@mui/icons-material/Badge';
import BuildIcon            from '@mui/icons-material/Build';
import CalendarTodayIcon    from '@mui/icons-material/CalendarToday';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import CloseIcon            from '@mui/icons-material/Close';
import ContactMailIcon      from '@mui/icons-material/ContactMail';
import DeleteIcon           from '@mui/icons-material/Delete';
import DescriptionIcon      from '@mui/icons-material/Description';
import DragIndicatorIcon    from '@mui/icons-material/DragIndicator';
import EditIcon             from '@mui/icons-material/Edit';
import EmailIcon            from '@mui/icons-material/Email';
import ExpandLessIcon       from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon       from '@mui/icons-material/ExpandMore';
import FilterListIcon       from '@mui/icons-material/FilterList';
import FolderIcon           from '@mui/icons-material/Folder';
import GridViewIcon         from '@mui/icons-material/GridView';
import GroupsIcon           from '@mui/icons-material/Groups';
import HelpOutlineIcon      from '@mui/icons-material/HelpOutline';
import HomeIcon             from '@mui/icons-material/Home';
import InsertDriveFileIcon  from '@mui/icons-material/InsertDriveFile';
import LaunchIcon           from '@mui/icons-material/Launch';
import LinkIcon             from '@mui/icons-material/Link';
import ListIcon             from '@mui/icons-material/List';
import LowPriorityIcon      from '@mui/icons-material/LowPriority';
import PersonIcon           from '@mui/icons-material/Person';
import PhoneIcon            from '@mui/icons-material/Phone';
import PriorityHighIcon     from '@mui/icons-material/PriorityHigh';
import RocketLaunchIcon     from '@mui/icons-material/RocketLaunch';
import SaveIcon             from '@mui/icons-material/Save';
import SearchIcon           from '@mui/icons-material/Search';
import SendIcon             from '@mui/icons-material/Send';
import SettingsIcon         from '@mui/icons-material/Settings';
import StarIcon             from '@mui/icons-material/Star';
import TerminalIcon         from '@mui/icons-material/Terminal';
import TuneIcon             from '@mui/icons-material/Tune';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import OpenInNewIcon        from '@mui/icons-material/OpenInNew';
import PlayArrowIcon        from '@mui/icons-material/PlayArrow';
import StopIcon             from '@mui/icons-material/Stop';

import {
  Department as ApiDepartment,
  DeptSidebarItem,
  DeptSidebarItemWrite,
  OrgMember,
  SidebarItemType,
  deptSidebarApi,
} from '../services/enterpriseApi';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';
import {
  listDevWorkspaces,
  startDevWorkspace,
  stopDevWorkspace,
  type DevWorkspace,
} from '../services/devWorkspaceApi';
import WorkspaceCreationWizard from '../components/Workspace/WorkspaceCreationWizard';

const T = {
  bg:     dashboardTokens.colors.background,
  card:   dashboardTokens.colors.surface,
  card2:  dashboardTokens.colors.surfaceSubtle,
  border: dashboardTokens.colors.border,
  text:   dashboardTokens.colors.textPrimary,
  sub:    dashboardTokens.colors.textSecondary,
  brand:  dashboardTokens.colors.brandPrimary,
  green:  dashboardSemanticColors.success,
  yellow: dashboardSemanticColors.warning,
  red:    dashboardSemanticColors.danger,
  blue:   '#3b82f6',
  purple: '#8b5cf6',
  font:   '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  HomeIcon:        <HomeIcon sx={{ fontSize: '1rem' }} />,
  GroupsIcon:      <GroupsIcon sx={{ fontSize: '1rem' }} />,
  BuildIcon:       <BuildIcon sx={{ fontSize: '1rem' }} />,
  FolderIcon:      <FolderIcon sx={{ fontSize: '1rem' }} />,
  DescriptionIcon: <DescriptionIcon sx={{ fontSize: '1rem' }} />,
  HelpOutlineIcon: <HelpOutlineIcon sx={{ fontSize: '1rem' }} />,
  ContactMailIcon: <ContactMailIcon sx={{ fontSize: '1rem' }} />,
  LinkIcon:        <LinkIcon sx={{ fontSize: '1rem' }} />,
  StarIcon:        <StarIcon sx={{ fontSize: '1rem' }} />,
  RocketLaunchIcon:<RocketLaunchIcon sx={{ fontSize: '1rem' }} />,
  SettingsIcon:    <SettingsIcon sx={{ fontSize: '1rem' }} />,
  ArticleIcon:     <ArticleIcon sx={{ fontSize: '1rem' }} />,
  EmailIcon:       <EmailIcon sx={{ fontSize: '1rem' }} />,
  BusinessIcon:    <BadgeIcon sx={{ fontSize: '1rem' }} />,
  TerminalIcon:    <TerminalIcon sx={{ fontSize: '1rem' }} />,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

// ── Default sidebar items (seeded when API returns empty) ─────────────────────
export const DEFAULT_SIDEBAR_ITEMS: DeptSidebarItemWrite[] = [
  { item_type: 'navigation', label: 'Overview',   url: 'overview',   icon: 'HomeIcon',        order_index: 0,  is_active: true },
  { item_type: 'navigation', label: 'Team',        url: 'team',        icon: 'GroupsIcon',      order_index: 1,  is_active: true },
  { item_type: 'navigation', label: 'Services',    url: 'services',    icon: 'BuildIcon',       order_index: 2,  is_active: true },
  { item_type: 'navigation', label: 'Projects',    url: 'projects',    icon: 'FolderIcon',      order_index: 3,  is_active: true },
  { item_type: 'navigation', label: 'Documents',   url: 'documents',   icon: 'DescriptionIcon', order_index: 4,  is_active: true },
  { item_type: 'navigation', label: 'FAQs',        url: 'faqs',        icon: 'HelpOutlineIcon', order_index: 5,  is_active: true },
  { item_type: 'navigation', label: 'Contact',     url: 'contact',     icon: 'ContactMailIcon', order_index: 6,  is_active: true },
  { item_type: 'navigation', label: 'Dev Workspaces', url: 'workspaces', icon: 'TerminalIcon',    order_index: 7,  is_active: true },
  { item_type: 'action',     label: 'Submit Request', url: '',         icon: 'RocketLaunchIcon', order_index: 0, is_active: true },
  { item_type: 'resource',   label: 'Handbook',    url: '',            icon: 'ArticleIcon',     order_index: 0,  is_active: true },
  { item_type: 'highlight',  label: 'Hiring',      url: '',            icon: 'StarIcon',        order_index: 0,  is_active: true },
];

// ── Type helpers ──────────────────────────────────────────────────────────────
type DeptSubView =
  | 'overview' | 'team' | 'services' | 'projects'
  | 'documents' | 'faqs' | 'contact' | 'workspaces';

interface DeptPageProps {
  deptId:   string;
  dept:     ApiDepartment | null;
  orgId:    string;
  orgSlug:  string;
  orgName:  string;
  members:  OrgMember[];
  onBack:   () => void;
  /** Current sub-view driven by the URL wildcard. Defaults to 'overview'. */
  subView?: string;
  onSubViewChange?: (v: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Main component
// ═══════════════════════════════════════════════════════════════════════════════
export default function DepartmentPage({
  deptId, dept, orgId, orgSlug, orgName, members,
  onBack, subView = 'overview', onSubViewChange,
}: DeptPageProps) {

  const [items, setItems]         = useState<DeptSidebarItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [snack, setSnack]         = useState('');

  // Load sidebar items
  useEffect(() => {
    if (!orgId || !deptId) return;
    let cancelled = false;
    setLoading(true);
    deptSidebarApi.list(orgId, deptId)
      .then(data => {
        if (cancelled) return;
        setItems(data.length ? data : (DEFAULT_SIDEBAR_ITEMS as unknown as DeptSidebarItem[]));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setItems(DEFAULT_SIDEBAR_ITEMS as unknown as DeptSidebarItem[]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [orgId, deptId]);

  const handleSidebarSave = useCallback(async (updated: DeptSidebarItemWrite[]) => {
    try {
      const saved = await deptSidebarApi.bulkSet(orgId, deptId, updated);
      setItems(saved);
      setSnack('Sidebar saved.');
    } catch {
      setSnack('Failed to save sidebar.');
    }
    setEditorOpen(false);
  }, [orgId, deptId]);

  // ── Filtered sidebar sections
  const navItems    = items.filter(i => i.item_type === 'navigation' && i.is_active);
  const actions     = items.filter(i => i.item_type === 'action'     && i.is_active);
  const resources   = items.filter(i => i.item_type === 'resource'   && i.is_active);
  const highlights  = items.filter(i => i.item_type === 'highlight'  && i.is_active);
  const customLinks = items.filter(i => i.item_type === 'custom'     && i.is_active);

  const deptInitials = (dept?.name ?? 'D').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const currentView = (subView || 'overview') as DeptSubView;

  // ── Sidebar nav active check
  const isActive = (url: string) => (currentView === url);

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════════════
          LEFT SIDEBAR
      ══════════════════════════════════════════════════════════════════ */}
      <Box sx={{
        width: 210, flexShrink: 0, bgcolor: '#0d1117',
        borderRight: '1px solid #21262d',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Back + dept identity */}
        <Box sx={{ p: 1.5, borderBottom: '1px solid #21262d' }}>
          <Button size="small" startIcon={<ArrowBackIcon sx={{ fontSize: '.85rem' }} />}
            onClick={onBack}
            sx={{ color: '#8b949e', fontFamily: T.font, fontWeight: 500, fontSize: '.78rem',
              mb: 1.5, pl: 0, '&:hover': { color: '#e6edf3' }, minWidth: 0 }}>
            Departments
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: `${T.brand}33`, color: T.brand,
              fontWeight: 800, fontSize: '.8rem', border: `1px solid ${T.brand}44` }}>
              {deptInitials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: '#e6edf3', fontWeight: 700, fontSize: '.82rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: T.font, lineHeight: 1.3 }}>
                {dept?.name ?? '…'}
              </Typography>
              {dept?.category && (
                <Typography sx={{ color: '#8b949e', fontSize: '.68rem', lineHeight: 1 }}>
                  {dept.category}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Loading spinner */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={20} sx={{ color: T.brand }} />
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>

            {/* Navigation section */}
            {navItems.length > 0 && (
              <Box>
                <Typography sx={{ color: '#8b949e', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase', px: 2, pt: 1.5, pb: 0.75 }}>
                  Navigation
                </Typography>
                {navItems.map(item => (
                  <SidebarNavButton
                    key={item.id ?? item.label}
                    item={item}
                    active={isActive(item.url)}
                    onClick={() => onSubViewChange?.(item.url)}
                  />
                ))}
              </Box>
            )}

            {/* Quick Actions */}
            {actions.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ color: '#8b949e', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase', px: 2, pt: 1, pb: 0.75 }}>
                  Quick Actions
                </Typography>
                {actions.map(item => (
                  <SidebarNavButton
                    key={item.id ?? item.label}
                    item={item}
                    active={false}
                    onClick={() => item.url ? window.open(item.url, '_blank') : undefined}
                    external
                  />
                ))}
              </Box>
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ color: '#8b949e', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase', px: 2, pt: 1, pb: 0.75 }}>
                  Resources
                </Typography>
                {resources.map(item => (
                  <SidebarNavButton
                    key={item.id ?? item.label}
                    item={item}
                    active={false}
                    onClick={() => item.url ? window.open(item.url, '_blank') : undefined}
                    external
                  />
                ))}
              </Box>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ color: '#8b949e', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase', px: 2, pt: 1, pb: 0.75 }}>
                  Highlights
                </Typography>
                {highlights.map(item => (
                  <SidebarNavButton
                    key={item.id ?? item.label}
                    item={item}
                    active={false}
                    onClick={() => item.url ? window.open(item.url, '_blank') : undefined}
                  />
                ))}
              </Box>
            )}

            {/* Custom links */}
            {customLinks.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ color: '#8b949e', fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase', px: 2, pt: 1, pb: 0.75 }}>
                  Links
                </Typography>
                {customLinks.map(item => (
                  <SidebarNavButton
                    key={item.id ?? item.label}
                    item={item}
                    active={false}
                    onClick={() => item.url ? window.open(item.url, '_blank') : undefined}
                    external
                  />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Sidebar edit button */}
        <Divider sx={{ borderColor: '#21262d' }} />
        <Box sx={{ p: 1.5 }}>
          <Button fullWidth size="small" startIcon={<TuneIcon sx={{ fontSize: '.85rem' }} />}
            onClick={() => setEditorOpen(true)}
            sx={{ color: '#8b949e', fontFamily: T.font, fontSize: '.78rem', fontWeight: 500,
              justifyContent: 'flex-start', pl: 1.25, '&:hover': { color: '#e6edf3', bgcolor: '#161b22' } }}>
            Customise sidebar
          </Button>
        </Box>
      </Box>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: T.bg ?? '#010409', p: 3 }}>

        {/* Dept header strip */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
              <Typography variant="h5" sx={{ color: T.text, fontWeight: 800, fontFamily: T.font }}>
                {dept?.name ?? '…'}
              </Typography>
              {dept?.category && (
                <Chip label={dept.category} size="small"
                  sx={{ bgcolor: `${T.brand}18`, color: T.brand, fontWeight: 600, fontSize: '.7rem' }} />
              )}
            </Box>
            {dept?.description && (
              <Typography variant="body2" sx={{ color: T.sub, maxWidth: 600 }}>
                {dept.description}
              </Typography>
            )}
          </Box>
          {dept?.department_lead && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ color: T.sub, fontSize: '1rem' }} />
              <Typography variant="body2" sx={{ color: T.sub, fontSize: '.85rem' }}>
                Lead: <strong style={{ color: T.text }}>{dept.department_lead}</strong>
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── View content ── */}
        {currentView === 'overview'   && <DeptOverview   dept={dept} members={members} sidebarItems={items} onNavigate={v => onSubViewChange?.(v)} />}
        {currentView === 'team'       && <DeptTeam       dept={dept}     members={members} />}
        {currentView === 'services'   && <DeptServices   dept={dept} />}
        {currentView === 'projects'   && <DeptProjects   dept={dept} />}
        {currentView === 'documents'  && <DeptDocuments  dept={dept} />}
        {currentView === 'faqs'       && <DeptFAQs       dept={dept} />}
        {currentView === 'contact'    && <DeptContact    dept={dept}     members={members} />}
        {currentView === 'workspaces' && <DeptDevWorkspaces orgId={orgId} deptId={deptId} dept={dept} />}
      </Box>

      {/* ══════════════════════════════════════════════════════════════════
          SIDEBAR EDITOR DIALOG
      ══════════════════════════════════════════════════════════════════ */}
      <SidebarEditorDialog
        open={editorOpen}
        items={items}
        onClose={() => setEditorOpen(false)}
        onSave={handleSidebarSave}
      />

      {/* Snackbar */}
      {snack && (
        <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          bgcolor: '#161b22', border: '1px solid #30363d', color: '#e6edf3',
          borderRadius: 2, px: 2.5, py: 1.25, fontSize: '.85rem', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 1 }}
          onClick={() => setSnack('')}>
          <CheckCircleIcon sx={{ color: T.green, fontSize: '1rem' }} />
          {snack}
        </Box>
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sidebar nav button
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarNavButton({
  item, active, onClick, external = false,
}: {
  item: DeptSidebarItem | DeptSidebarItemWrite;
  active: boolean;
  onClick: () => void;
  external?: boolean;
}) {

  const icon = ICON_MAP[item.icon] ?? <LinkIcon sx={{ fontSize: '1rem' }} />;
  return (
    <Button fullWidth onClick={onClick}
      sx={{
        justifyContent: 'flex-start', px: 2, py: 0.9, borderRadius: 0,
        fontFamily: T.font, fontWeight: active ? 700 : 400, fontSize: '.85rem',
        color: active ? '#e6edf3' : '#8b949e',
        bgcolor: active ? '#161b22' : 'transparent',
        borderLeft: active ? `3px solid ${T.brand}` : '3px solid transparent',
        gap: 1.25,
        '&:hover': { bgcolor: '#161b22', color: '#e6edf3' },
        transition: 'all .12s',
        textTransform: 'none',
      }}>
      <Box sx={{ color: active ? T.brand : '#8b949e', display: 'flex', flexShrink: 0 }}>{icon}</Box>
      <Typography noWrap sx={{ fontSize: '.85rem', fontWeight: 'inherit', lineHeight: 1 }}>
        {item.label}
      </Typography>
      {external && (
        <LaunchIcon sx={{ fontSize: '.7rem', color: '#484f58', ml: 'auto', flexShrink: 0 }} />
      )}
    </Button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: Overview (full hero layout)
// ═══════════════════════════════════════════════════════════════════════════════
function DeptOverview({
  dept, members, sidebarItems, onNavigate,
}: {
  dept: ApiDepartment | null;
  members: OrgMember[];
  sidebarItems: DeptSidebarItem[];
  onNavigate: (v: string) => void;
}) {
  const teamCount   = dept?.teams?.length ?? 0;
  const memberCount = members.length;
  const groupCount  = dept?.teams?.reduce((s, t) => s + (t.groups?.length ?? 0), 0) ?? 0;
  const deptInitials = (dept?.name ?? 'D').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const quickActions = sidebarItems.filter(i => i.item_type === 'action'   && i.is_active);
  const resources    = sidebarItems.filter(i => i.item_type === 'resource' && i.is_active);
  const highlights   = sidebarItems.filter(i => i.item_type === 'highlight' && i.is_active);

  const roleColor: Record<string, string> = {
    OWNER: T.brand, ADMIN: T.blue, MANAGER: T.purple, MEMBER: T.green, VIEWER: T.sub,
  };
  const typeColor: Record<string, string> = {
    DEPARTMENT: T.brand, FUNCTION: T.blue, SQUAD: T.purple,
  };

  return (
    <Box>

      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      <Paper sx={{ mb: 3, bgcolor: T.card, border: `1px solid ${T.border}`,
        borderRadius: 2.5, overflow: 'hidden' }}>
        {/* Gradient top bar */}
        <Box sx={{ height: 5, background: `linear-gradient(90deg, ${T.brand}, ${T.blue}, ${T.purple})` }} />
        <Box sx={{ p: 3, display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <Avatar sx={{ width: 72, height: 72, bgcolor: `${T.brand}22`, color: T.brand,
            fontWeight: 800, fontSize: '1.7rem', border: `2px solid ${T.brand}44`,
            borderRadius: 2.5, flexShrink: 0 }}>
            {deptInitials}
          </Avatar>

          {/* Identity */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.75 }}>
              <Typography variant="h5" sx={{ color: T.text, fontWeight: 800, lineHeight: 1, fontFamily: T.font }}>
                {dept?.name ?? '—'}
              </Typography>
              {dept?.category && (
                <Chip label={dept.category} size="small"
                  sx={{ bgcolor: `${T.brand}18`, color: T.brand, fontWeight: 700, fontSize: '.72rem', height: 22, borderRadius: 1 }} />
              )}
            </Box>

            {dept?.description && (
              <Typography variant="body2" sx={{ color: T.sub, lineHeight: 1.75, mb: 1.5, maxWidth: 640 }}>
                {dept.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {dept?.department_lead && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PersonIcon sx={{ fontSize: '.9rem', color: T.sub }} />
                  <Typography variant="body2" sx={{ color: T.sub, fontSize: '.82rem' }}>
                    Lead: <Box component="span" sx={{ color: T.text, fontWeight: 700 }}>{dept.department_lead}</Box>
                  </Typography>
                </Box>
              )}
              {dept?.created_at && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography variant="body2" sx={{ color: T.sub, fontSize: '.82rem' }}>
                    Created {new Date(dept.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Stat pills */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignSelf: 'center' }}>
            {[
              { label: 'Teams',   value: teamCount,   color: T.brand  },
              { label: 'Groups',  value: groupCount,  color: T.purple },
              { label: 'Members', value: memberCount, color: T.blue   },
            ].map(s => (
              <Box key={s.label} sx={{ textAlign: 'center', px: 2, py: 1.25,
                bgcolor: `${s.color}12`, border: `1px solid ${s.color}30`,
                borderRadius: 2, minWidth: 70 }}>
                <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.5rem',
                  lineHeight: 1, fontFamily: T.font }}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: T.sub, fontSize: '.72rem' }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* ── Two-column layout below hero ────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>

        {/* Left column */}
        <Box sx={{ flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Teams grid */}
          {teamCount > 0 && (
            <Paper sx={{ p: 3, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupsIcon sx={{ color: T.brand, fontSize: '1.1rem' }} />
                  <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>Teams</Typography>
                </Box>
                <Button size="small" sx={{ color: T.brand, fontSize: '.78rem', fontFamily: T.font }}
                  onClick={() => onNavigate('team')}>View all →</Button>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
                {dept!.teams.map(team => (
                  <Paper key={team.id} sx={{ p: 2, bgcolor: T.card2,
                    border: `1px solid ${T.border}`, borderRadius: 2,
                    transition: 'border-color .2s', '&:hover': { borderColor: `${T.brand}60` } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%',
                        bgcolor: typeColor[team.team_type] ?? T.brand, flexShrink: 0 }} />
                      <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.85rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {team.name}
                      </Typography>
                    </Box>
                    <Chip label={team.team_type} size="small"
                      sx={{ bgcolor: `${typeColor[team.team_type] ?? T.brand}15`,
                        color: typeColor[team.team_type] ?? T.brand,
                        fontWeight: 600, fontSize: '.65rem', height: 18 }} />
                    {(team.groups?.length ?? 0) > 0 && (
                      <Typography variant="caption" sx={{ color: T.sub, display: 'block', mt: 0.5 }}>
                        {team.groups.length} group{team.groups.length !== 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            </Paper>
          )}

          {/* People spotlight */}
          {memberCount > 0 && (
            <Paper sx={{ p: 3, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: T.blue, fontSize: '1.1rem' }} />
                  <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem' }}>People</Typography>
                </Box>
                {memberCount > 6 && (
                  <Button size="small" sx={{ color: T.brand, fontSize: '.78rem', fontFamily: T.font }}
                    onClick={() => onNavigate('team')}>View all →</Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {members.slice(0, 9).map(m => {
                  const initials = (m.name ?? m.email).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const rc = roleColor[m.role] ?? T.sub;
                  return (
                    <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25,
                      px: 1.5, py: 1, bgcolor: T.card2, border: `1px solid ${T.border}`,
                      borderRadius: 2, minWidth: 160, flex: '1 1 160px' }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: `${rc}20`, color: rc,
                        fontWeight: 800, fontSize: '.78rem', flexShrink: 0 }}>{initials}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.82rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name || m.email}
                        </Typography>
                        <Typography variant="caption" sx={{ color: rc, fontSize: '.68rem', fontWeight: 700 }}>
                          {m.role}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
                {memberCount > 9 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    px: 1.5, py: 1, bgcolor: T.card2, border: `1px solid ${T.border}`,
                    borderRadius: 2, minWidth: 80 }}>
                    <Typography sx={{ color: T.sub, fontSize: '.82rem' }}>+{memberCount - 9} more</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Box>

        {/* Right column */}
        <Box sx={{ flex: '0 1 280px', minWidth: 240, display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <RocketLaunchIcon sx={{ color: T.green, fontSize: '1rem' }} />
                <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.88rem' }}>Quick Actions</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {quickActions.map(item => (
                  <Button key={item.id ?? item.label} fullWidth variant="outlined" size="small"
                    startIcon={ICON_MAP[item.icon] ?? <LinkIcon sx={{ fontSize: '.9rem' }} />}
                    onClick={() => item.url ? window.open(item.url, '_blank') : undefined}
                    sx={{ justifyContent: 'flex-start', borderColor: `${T.green}40`,
                      color: T.text, fontSize: '.82rem', fontFamily: T.font,
                      '&:hover': { bgcolor: `${T.green}10`, borderColor: T.green } }}>
                    {item.label}
                  </Button>
                ))}
              </Box>
            </Paper>
          )}

          {/* Resources */}
          {resources.length > 0 && (
            <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ArticleIcon sx={{ color: T.blue, fontSize: '1rem' }} />
                <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.88rem' }}>Resources</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {resources.map(item => (
                  <Box key={item.id ?? item.label}
                    onClick={() => item.url ? window.open(item.url, '_blank') : undefined}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25,
                      bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 1.5,
                      cursor: item.url ? 'pointer' : 'default',
                      '&:hover': item.url ? { borderColor: `${T.blue}60`, bgcolor: `${T.blue}08` } : {} }}>
                    <Box sx={{ color: T.blue, display: 'flex', flexShrink: 0 }}>
                      {ICON_MAP[item.icon] ?? <ArticleIcon sx={{ fontSize: '1rem' }} />}
                    </Box>
                    <Typography sx={{ color: T.text, fontSize: '.82rem', fontWeight: 500 }}>{item.label}</Typography>
                    {item.url && <LaunchIcon sx={{ fontSize: '.7rem', color: T.sub, ml: 'auto', flexShrink: 0 }} />}
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <StarIcon sx={{ color: T.yellow, fontSize: '1rem' }} />
                <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.88rem' }}>Highlights</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {highlights.map(item => (
                  <Box key={item.id ?? item.label}
                    onClick={() => item.url ? window.open(item.url, '_blank') : undefined}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25,
                      bgcolor: `${T.yellow}0a`, border: `1px solid ${T.yellow}28`,
                      borderRadius: 1.5, cursor: item.url ? 'pointer' : 'default',
                      '&:hover': item.url ? { bgcolor: `${T.yellow}15` } : {} }}>
                    <StarIcon sx={{ color: T.yellow, fontSize: '.9rem', flexShrink: 0 }} />
                    <Typography sx={{ color: T.text, fontSize: '.82rem', fontWeight: 600 }}>{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* Meta info card */}
          <Paper sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.88rem', mb: 1.5 }}>Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {dept?.category && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: T.sub }}>Category</Typography>
                  <Chip label={dept.category} size="small"
                    sx={{ bgcolor: `${T.brand}12`, color: T.brand, fontWeight: 600, fontSize: '.68rem', height: 20 }} />
                </Box>
              )}
              {dept?.department_lead && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: T.sub }}>Lead</Typography>
                  <Typography variant="caption" sx={{ color: T.text, fontWeight: 600 }}>{dept.department_lead}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: T.sub }}>Teams</Typography>
                <Typography variant="caption" sx={{ color: T.text, fontWeight: 600 }}>{teamCount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: T.sub }}>Members</Typography>
                <Typography variant="caption" sx={{ color: T.text, fontWeight: 600 }}>{memberCount}</Typography>
              </Box>
              {dept?.created_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: T.sub }}>Created</Typography>
                  <Typography variant="caption" sx={{ color: T.sub }}>
                    {new Date(dept.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

        </Box>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: Team
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: Team (full implementation)
// ═══════════════════════════════════════════════════════════════════════════════
function DeptTeam({ dept, members }: { dept: ApiDepartment | null; members: OrgMember[] }) {
  const teams = dept?.teams ?? [];

  // ── local state ──────────────────────────────────────────────────────────
  const [tab, setTab]               = useState<'teams' | 'members'>('teams');
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [memberView, setMemberView] = useState<'grid' | 'list'>('grid');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // ── derived ──────────────────────────────────────────────────────────────
  const totalGroups  = teams.reduce((s, t) => s + (t.groups?.length ?? 0), 0);
  const leaders      = members.filter(m => m.role === 'OWNER' || m.role === 'ADMIN');
  const managers     = members.filter(m => m.role === 'MANAGER');

  const filteredMembers = members.filter(m => {
    const matchRole   = roleFilter === 'ALL' || m.role === roleFilter;
    const q           = memberSearch.toLowerCase();
    const matchSearch = !q || (m.name ?? '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  // ── style helpers ─────────────────────────────────────────────────────────
  const roleColor: Record<string, string> = {
    OWNER: T.brand, ADMIN: T.blue, MANAGER: T.purple, MEMBER: T.green, VIEWER: T.sub,
  };
  const typeColor: Record<string, string> = {
    DEPARTMENT: T.brand, FUNCTION: T.blue, SQUAD: T.purple,
  };
  const typeLabel: Record<string, string> = {
    DEPARTMENT: 'Department', FUNCTION: 'Function', SQUAD: 'Squad',
  };

  return (
    <Box>

      {/* ── Stat strip ────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Teams',    value: teams.length,    color: T.brand,  icon: <GroupsIcon /> },
          { label: 'Groups',   value: totalGroups,     color: T.purple, icon: <FolderIcon /> },
          { label: 'Members',  value: members.length,  color: T.blue,   icon: <PersonIcon /> },
          { label: 'Leaders',  value: leaders.length,  color: T.yellow, icon: <BadgeIcon  /> },
        ].map(s => (
          <Paper key={s.label} sx={{ flex: '1 1 120px', p: 2, bgcolor: T.card,
            border: `1px solid ${T.border}`, borderRadius: 2,
            display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: `${s.color}15`, borderRadius: 1.5, p: 0.8,
              color: s.color, display: 'inline-flex', flexShrink: 0 }}>{s.icon}</Box>
            <Box>
              <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.5rem',
                lineHeight: 1, fontFamily: T.font }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ color: T.sub }}>{s.label}</Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 0, mb: 3, borderBottom: `1px solid ${T.border}` }}>
        {(['teams', 'members'] as const).map(t => (
          <Button key={t} onClick={() => setTab(t)}
            sx={{
              px: 2.5, py: 1.25, borderRadius: 0, textTransform: 'none',
              fontFamily: T.font, fontWeight: tab === t ? 700 : 500, fontSize: '.88rem',
              color: tab === t ? T.brand : T.sub,
              borderBottom: tab === t ? `2px solid ${T.brand}` : '2px solid transparent',
              mb: '-1px',
              '&:hover': { color: T.text, bgcolor: 'transparent' },
            }}>
            {t === 'teams' ? `Teams (${teams.length})` : `Members (${members.length})`}
          </Button>
        ))}
      </Box>

      {/* ══════════════════════════════════════════════════════════════════
          TEAMS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'teams' && (
        <Box>
          {teams.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <GroupsIcon sx={{ fontSize: '3rem', color: T.sub, opacity: .3, mb: 1.5 }} />
              <Typography sx={{ color: T.sub }}>No teams in this department yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {teams.map(team => {
                const tc      = typeColor[team.team_type] ?? T.brand;
                const isOpen  = expandedTeam === team.id;
                return (
                  <Paper key={team.id}
                    sx={{ bgcolor: T.card, border: `1px solid ${isOpen ? tc + '50' : T.border}`,
                      borderRadius: 2, overflow: 'hidden',
                      transition: 'border-color .2s, box-shadow .2s',
                      boxShadow: isOpen ? `0 0 0 1px ${tc}22` : 'none' }}>

                    {/* ── Team header row ── */}
                    <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                      onClick={() => setExpandedTeam(isOpen ? null : team.id)}>

                      {/* Color dot + icon */}
                      <Box sx={{ width: 42, height: 42, borderRadius: 2,
                        bgcolor: `${tc}18`, border: `1px solid ${tc}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0 }}>
                        <GroupsIcon sx={{ color: tc, fontSize: '1.3rem' }} />
                      </Box>

                      {/* Name + meta */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mb: 0.4 }}>
                          <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem', fontFamily: T.font }}>
                            {team.name}
                          </Typography>
                          <Chip label={typeLabel[team.team_type] ?? team.team_type} size="small"
                            sx={{ bgcolor: `${tc}18`, color: tc, fontWeight: 700,
                              fontSize: '.68rem', height: 20, borderRadius: 1 }} />
                        </Box>
                        {team.description && (
                          <Typography variant="body2" sx={{ color: T.sub, fontSize: '.82rem',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                            {team.description}
                          </Typography>
                        )}
                      </Box>

                      {/* Stats badges */}
                      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                        <Chip
                          icon={<FolderIcon sx={{ fontSize: '.8rem !important', ml: '4px' }} />}
                          label={`${team.groups?.length ?? 0} groups`}
                          size="small"
                          sx={{ bgcolor: `${T.purple}12`, color: T.purple, fontWeight: 600, fontSize: '.72rem' }} />
                      </Box>

                      {/* Expand caret */}
                      <Box sx={{ color: T.sub, display: 'flex', flexShrink: 0 }}>
                        {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </Box>
                    </Box>

                    {/* ── Expanded groups panel ── */}
                    <Collapse in={isOpen}>
                      <Divider sx={{ borderColor: T.border }} />
                      <Box sx={{ p: 2.5, bgcolor: T.card2 }}>
                        {(team.groups?.length ?? 0) === 0 ? (
                          <Typography variant="body2" sx={{ color: T.sub, py: 1, fontStyle: 'italic' }}>
                            No groups in this team yet.
                          </Typography>
                        ) : (
                          <>
                            <Typography variant="caption" sx={{ color: T.sub, fontWeight: 700,
                              letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                              Groups
                            </Typography>
                            <Box sx={{ display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
                              {team.groups.map(g => (
                                <Paper key={g.id} sx={{ p: 2, bgcolor: T.card,
                                  border: `1px solid ${T.border}`, borderRadius: 2,
                                  transition: 'border-color .2s',
                                  '&:hover': { borderColor: `${T.purple}60` } }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Box sx={{ width: 30, height: 30, borderRadius: 1.5,
                                      bgcolor: `${T.purple}15`, display: 'flex',
                                      alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <FolderIcon sx={{ color: T.purple, fontSize: '.95rem' }} />
                                    </Box>
                                    <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.85rem',
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {g.name}
                                    </Typography>
                                  </Box>
                                  {g.description && (
                                    <Typography variant="caption" sx={{ color: T.sub, display: 'block',
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {g.description}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" sx={{ color: T.sub, mt: 0.5, display: 'block', fontSize: '.68rem' }}>
                                    Created {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </Typography>
                                </Paper>
                              ))}
                            </Box>
                          </>
                        )}
                      </Box>
                    </Collapse>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MEMBERS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'members' && (
        <Box>

          {/* ── Toolbar: search + filter + view toggle ── */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search by name or email…"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              sx={{ flex: '1 1 220px',
                '& input': { color: T.text, fontSize: '.85rem' },
                '& .MuiOutlinedInput-root': { bgcolor: T.card2 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: T.sub, fontSize: '1rem' }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Role filter */}
            <Select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              size="small"
              displayEmpty
              startAdornment={<FilterListIcon sx={{ color: T.sub, fontSize: '1rem', mr: 0.5 }} />}
              sx={{ minWidth: 140, bgcolor: T.card2, color: T.text, fontSize: '.85rem',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: T.border } }}>
              <MenuItem value="ALL">All roles</MenuItem>
              {['OWNER','ADMIN','MANAGER','MEMBER','VIEWER'].map(r => (
                <MenuItem key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</MenuItem>
              ))}
            </Select>

            {/* Grid / List toggle */}
            <Box sx={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 1.5, overflow: 'hidden' }}>
              {(['grid', 'list'] as const).map(v => (
                <Tooltip key={v} title={v === 'grid' ? 'Grid view' : 'List view'}>
                  <IconButton size="small" onClick={() => setMemberView(v)}
                    sx={{ borderRadius: 0, px: 1.25, py: 0.75,
                      bgcolor: memberView === v ? `${T.brand}18` : 'transparent',
                      color:   memberView === v ? T.brand : T.sub,
                      '&:hover': { bgcolor: `${T.brand}10` } }}>
                    {v === 'grid' ? <GridViewIcon sx={{ fontSize: '1rem' }} /> : <ListIcon sx={{ fontSize: '1rem' }} />}
                  </IconButton>
                </Tooltip>
              ))}
            </Box>

            <Typography variant="caption" sx={{ color: T.sub, alignSelf: 'center', ml: 'auto' }}>
              {filteredMembers.length} of {members.length}
            </Typography>
          </Box>

          {/* ── Role sections (OWNER/ADMIN first, then grouped) ── */}
          {filteredMembers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <PersonIcon sx={{ fontSize: '3rem', color: T.sub, opacity: .3, mb: 1.5 }} />
              <Typography sx={{ color: T.sub }}>No members match your search.</Typography>
            </Box>
          ) : (
            <>
              {/* Section grouping when no filter active */}
              {roleFilter === 'ALL' && memberSearch === '' ? (
                <>
                  {/* Leadership */}
                  {leaders.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <BadgeIcon sx={{ color: T.yellow, fontSize: '1rem' }} />
                        <Typography sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem',
                          letterSpacing: '.08em', textTransform: 'uppercase' }}>
                          Leadership ({leaders.length})
                        </Typography>
                      </Box>
                      <MemberGrid members={leaders} view={memberView} roleColor={roleColor} />
                    </Box>
                  )}
                  {/* Managers */}
                  {managers.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <PersonIcon sx={{ color: T.purple, fontSize: '1rem' }} />
                        <Typography sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem',
                          letterSpacing: '.08em', textTransform: 'uppercase' }}>
                          Management ({managers.length})
                        </Typography>
                      </Box>
                      <MemberGrid members={managers} view={memberView} roleColor={roleColor} />
                    </Box>
                  )}
                  {/* Everyone else */}
                  {(() => {
                    const rest = members.filter(m => m.role === 'MEMBER' || m.role === 'VIEWER');
                    if (!rest.length) return null;
                    return (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <GroupsIcon sx={{ color: T.blue, fontSize: '1rem' }} />
                          <Typography sx={{ color: T.sub, fontWeight: 700, fontSize: '.75rem',
                            letterSpacing: '.08em', textTransform: 'uppercase' }}>
                            Members ({rest.length})
                          </Typography>
                        </Box>
                        <MemberGrid members={rest} view={memberView} roleColor={roleColor} />
                      </Box>
                    );
                  })()}
                </>
              ) : (
                /* Flat view when filtering */
                <MemberGrid members={filteredMembers} view={memberView} roleColor={roleColor} />
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Reusable member grid / list ───────────────────────────────────────────────
function MemberGrid({
  members, view, roleColor,
}: {
  members: OrgMember[];
  view: 'grid' | 'list';
  roleColor: Record<string, string>;
}) {
  if (view === 'list') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {members.map(m => {
          const initials = (m.name ?? m.email).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          const rc = roleColor[m.role] ?? T.sub;
          return (
            <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 2,
              p: 1.5, borderRadius: 1.5, bgcolor: T.card,
              border: `1px solid ${T.border}`,
              transition: 'border-color .15s',
              '&:hover': { borderColor: `${rc}50` } }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: `${rc}20`, color: rc,
                fontWeight: 800, fontSize: '.82rem', flexShrink: 0 }}>{initials}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: T.text, fontWeight: 600, fontSize: '.88rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name || m.email}
                </Typography>
                {m.name && (
                  <Typography variant="caption" sx={{ color: T.sub, display: 'block' }}>{m.email}</Typography>
                )}
              </Box>
              <Chip label={m.role} size="small"
                sx={{ bgcolor: `${rc}18`, color: rc, fontWeight: 700,
                  fontSize: '.68rem', height: 20, borderRadius: 1, flexShrink: 0 }} />
              <Chip label={m.status} size="small"
                sx={{ bgcolor: m.status === 'ACTIVE' ? `${T.green}15` : `${T.yellow}15`,
                  color: m.status === 'ACTIVE' ? T.green : T.yellow,
                  fontWeight: 600, fontSize: '.65rem', height: 20, borderRadius: 1, flexShrink: 0 }} />
            </Box>
          );
        })}
      </Box>
    );
  }

  // Grid view
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1.5 }}>
      {members.map(m => {
        const initials = (m.name ?? m.email).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        const rc = roleColor[m.role] ?? T.sub;
        return (
          <Paper key={m.id} sx={{ p: 2.5, bgcolor: T.card,
            border: `1px solid ${T.border}`, borderRadius: 2,
            borderTop: `3px solid ${rc}`,
            transition: 'border-color .15s, box-shadow .15s',
            '&:hover': { borderColor: `${rc}70`, boxShadow: `0 4px 20px ${rc}15` },
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, textAlign: 'center' }}>

            {/* Avatar */}
            <Avatar sx={{ width: 52, height: 52, bgcolor: `${rc}22`, color: rc,
              fontWeight: 800, fontSize: '1.1rem', border: `2px solid ${rc}44` }}>
              {initials}
            </Avatar>

            {/* Name */}
            <Box sx={{ minWidth: 0, width: '100%' }}>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.9rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name || m.email}
              </Typography>
              {m.name && (
                <Typography variant="caption" sx={{ color: T.sub, fontSize: '.75rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {m.email}
                </Typography>
              )}
            </Box>

            {/* Badges */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip label={m.role} size="small"
                sx={{ bgcolor: `${rc}18`, color: rc, fontWeight: 700,
                  fontSize: '.65rem', height: 20, borderRadius: 1 }} />
              <Chip label={m.status} size="small"
                sx={{ bgcolor: m.status === 'ACTIVE' ? `${T.green}15` : `${T.yellow}15`,
                  color: m.status === 'ACTIVE' ? T.green : T.yellow,
                  fontWeight: 600, fontSize: '.65rem', height: 20, borderRadius: 1 }} />
            </Box>

            {/* Joined */}
            {m.joined_at && (
              <Typography variant="caption" sx={{ color: T.sub, fontSize: '.7rem' }}>
                Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Typography>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: Services
// ═══════════════════════════════════════════════════════════════════════════════
type ServiceStatus = 'ACTIVE' | 'BETA' | 'DEPRECATED' | 'COMING_SOON';
type ServiceCategory = 'All' | 'Internal' | 'External' | 'API' | 'Tool' | 'Process';

interface DeptService {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  status: ServiceStatus;
  owner: string;
  url?: string;
  requestable?: boolean;
}

function DeptServices({ dept }: { dept: ApiDepartment | null }) {
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState<ServiceCategory>('All');
  const [addOpen, setAddOpen]     = useState(false);
  const [services, setServices]   = useState<DeptService[]>([]);
  const [form, setForm]           = useState<Partial<DeptService>>({});

  const statusColor: Record<ServiceStatus, string> = {
    ACTIVE: T.green, BETA: T.blue, DEPRECATED: T.sub, COMING_SOON: T.yellow,
  };
  const statusLabel: Record<ServiceStatus, string> = {
    ACTIVE: 'Active', BETA: 'Beta', DEPRECATED: 'Deprecated', COMING_SOON: 'Coming soon',
  };
  const CATS: ServiceCategory[] = ['All','Internal','External','API','Tool','Process'];

  const filtered = services.filter(s => {
    const matchCat  = catFilter === 'All' || s.category === catFilter;
    const q         = search.toLowerCase();
    const matchText = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    return matchCat && matchText;
  });

  const handleAdd = () => {
    if (!form.name?.trim()) return;
    const s: DeptService = {
      id:          Date.now().toString(),
      name:        form.name.trim(),
      description: form.description?.trim() ?? '',
      category:    (form.category as ServiceCategory) ?? 'Internal',
      status:      (form.status as ServiceStatus)   ?? 'ACTIVE',
      owner:       form.owner?.trim() ?? '',
      url:         form.url?.trim() ?? '',
      requestable: form.requestable ?? false,
    };
    setServices(prev => [...prev, s]);
    setForm({});
    setAddOpen(false);
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search services…" value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: '1 1 200px', '& input': { color: T.text }, '& .MuiOutlinedInput-root': { bgcolor: T.card2 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.sub, fontSize: '1rem' }} /></InputAdornment> }} />
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 }, borderRadius: 2, flexShrink: 0 }}>
          Add Service
        </Button>
      </Box>

      {/* Category chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {CATS.map(c => (
          <Chip key={c} label={c} size="small" clickable
            onClick={() => setCatFilter(c)}
            sx={{ fontWeight: catFilter === c ? 700 : 500,
              bgcolor: catFilter === c ? T.brand : `${T.brand}10`,
              color:   catFilter === c ? '#fff' : T.sub,
              '&:hover': { bgcolor: catFilter === c ? T.brand : `${T.brand}20` } }} />
        ))}
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <BuildIcon sx={{ fontSize: '3rem', color: T.sub, opacity: .3, mb: 2 }} />
          <Typography variant="h6" sx={{ color: T.text, fontWeight: 700, mb: 1 }}>No services yet</Typography>
          <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>
            Add the services {dept?.name ?? 'this department'} provides or maintains.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}
            sx={{ borderColor: T.brand, color: T.brand }}>Add First Service</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {filtered.map(s => (
            <Paper key={s.id} sx={{ p: 3, bgcolor: T.card, border: `1px solid ${T.border}`,
              borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5,
              borderLeft: `4px solid ${statusColor[s.status]}`,
              transition: 'box-shadow .2s', '&:hover': { boxShadow: `0 4px 20px ${T.brand}18` } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${statusColor[s.status]}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BuildIcon sx={{ color: statusColor[s.status], fontSize: '1.1rem' }} />
                  </Box>
                  <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem', fontFamily: T.font }}>{s.name}</Typography>
                </Box>
                <Chip label={statusLabel[s.status]} size="small"
                  sx={{ bgcolor: `${statusColor[s.status]}18`, color: statusColor[s.status],
                    fontWeight: 700, fontSize: '.65rem', height: 20, flexShrink: 0 }} />
              </Box>
              {s.description && (
                <Typography variant="body2" sx={{ color: T.sub, fontSize: '.82rem', lineHeight: 1.7,
                  display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>
                  {s.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={s.category} size="small"
                  sx={{ bgcolor: `${T.blue}12`, color: T.blue, fontWeight: 600, fontSize: '.65rem', height: 18 }} />
                {s.owner && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: '.75rem', color: T.sub }} />
                    <Typography variant="caption" sx={{ color: T.sub, fontSize: '.72rem' }}>{s.owner}</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 0.5 }}>
                {s.requestable && (
                  <Button size="small" variant="outlined" startIcon={<SendIcon sx={{ fontSize: '.75rem' }} />}
                    sx={{ borderColor: `${T.brand}50`, color: T.brand, fontSize: '.75rem', borderRadius: 1.5,
                      '&:hover': { bgcolor: `${T.brand}10` } }}>
                    Request Access
                  </Button>
                )}
                {s.url && (
                  <Button size="small" startIcon={<LaunchIcon sx={{ fontSize: '.75rem' }} />}
                    onClick={() => window.open(s.url, '_blank')}
                    sx={{ color: T.sub, fontSize: '.75rem', ml: 'auto' }}>Open</Button>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Add Service Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}` } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon sx={{ color: T.brand }} /> Add Service
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Service Name *" value={form.name ?? ''} autoFocus
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} size="small" />
          <TextField label="Description" value={form.description ?? ''} multiline rows={3}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} size="small" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Select value={form.category ?? 'Internal'} size="small" fullWidth
              onChange={e => setForm(f => ({ ...f, category: e.target.value as ServiceCategory }))}>
              {CATS.filter(c => c !== 'All').map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
            <Select value={form.status ?? 'ACTIVE'} size="small" fullWidth
              onChange={e => setForm(f => ({ ...f, status: e.target.value as ServiceStatus }))}>
              {(['ACTIVE','BETA','COMING_SOON','DEPRECATED'] as ServiceStatus[]).map(s =>
                <MenuItem key={s} value={s}>{statusLabel[s]}</MenuItem>)}
            </Select>
          </Box>
          <TextField label="Owner / Team" value={form.owner ?? ''}
            onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} size="small" />
          <TextField label="URL (optional)" value={form.url ?? ''}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))} size="small" />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${T.border}` }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}
            sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 } }}>Add Service</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: Projects
// ═══════════════════════════════════════════════════════════════════════════════
type ProjectStatus   = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
type ProjectPriority = 'HIGH' | 'MEDIUM' | 'LOW';

interface DeptProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  team: string;
  lead: string;
  dueDate: string;
  progress: number; // 0-100
}

function DeptProjects({ dept }: { dept: ApiDepartment | null }) {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [search, setSearch]             = useState('');
  const [addOpen, setAddOpen]           = useState(false);
  const [projects, setProjects]         = useState<DeptProject[]>([]);
  const [form, setForm]                 = useState<Partial<DeptProject>>({});

  const statusColor: Record<ProjectStatus, string> = {
    ACTIVE: T.green, ON_HOLD: T.yellow, COMPLETED: T.blue, CANCELLED: T.red,
  };
  const statusLabel: Record<ProjectStatus, string> = {
    ACTIVE: 'Active', ON_HOLD: 'On Hold', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  };
  const priorityColor: Record<ProjectPriority, string> = {
    HIGH: T.red, MEDIUM: T.yellow, LOW: T.green,
  };
  const PriorityIcon = ({ p }: { p: ProjectPriority }) => (
    p === 'HIGH'
      ? <PriorityHighIcon sx={{ fontSize: '1rem', color: T.red }} />
      : p === 'MEDIUM'
      ? <WarningAmberIcon sx={{ fontSize: '1rem', color: T.yellow }} />
      : <LowPriorityIcon sx={{ fontSize: '1rem', color: T.green }} />
  );

  const filtered = projects.filter(p => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const q           = search.toLowerCase();
    const matchText   = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchStatus && matchText;
  });

  const handleAdd = () => {
    if (!form.name?.trim()) return;
    setProjects(prev => [...prev, {
      id:          Date.now().toString(),
      name:        form.name!.trim(),
      description: form.description?.trim() ?? '',
      status:      (form.status as ProjectStatus)     ?? 'ACTIVE',
      priority:    (form.priority as ProjectPriority) ?? 'MEDIUM',
      team:        form.team?.trim()    ?? '',
      lead:        form.lead?.trim()    ?? '',
      dueDate:     form.dueDate         ?? '',
      progress:    Number(form.progress ?? 0),
    }]);
    setForm({});
    setAddOpen(false);
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search projects…" value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: '1 1 200px', '& input': { color: T.text }, '& .MuiOutlinedInput-root': { bgcolor: T.card2 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.sub, fontSize: '1rem' }} /></InputAdornment> }} />
        <Select value={statusFilter} size="small"
          onChange={e => setStatusFilter(e.target.value as ProjectStatus | 'ALL')}
          sx={{ minWidth: 140, bgcolor: T.card2, color: T.text }}>
          <MenuItem value="ALL">All statuses</MenuItem>
          {(['ACTIVE','ON_HOLD','COMPLETED','CANCELLED'] as ProjectStatus[]).map(s =>
            <MenuItem key={s} value={s}>{statusLabel[s]}</MenuItem>)}
        </Select>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 }, borderRadius: 2 }}>
          Add Project
        </Button>
      </Box>

      {/* Stats row */}
      {projects.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {(['ACTIVE','ON_HOLD','COMPLETED','CANCELLED'] as ProjectStatus[]).map(s => {
            const count = projects.filter(p => p.status === s).length;
            return (
              <Paper key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
                sx={{ flex: '1 1 100px', p: 2, bgcolor: T.card, border: `1px solid ${statusFilter === s ? statusColor[s] : T.border}`,
                  borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                  transition: 'all .2s', '&:hover': { borderColor: statusColor[s] } }}>
                <Typography sx={{ color: statusColor[s], fontWeight: 800, fontSize: '1.5rem', lineHeight: 1 }}>{count}</Typography>
                <Typography variant="caption" sx={{ color: T.sub }}>{statusLabel[s]}</Typography>
              </Paper>
            );
          })}
        </Box>
      )}

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <AssignmentIcon sx={{ fontSize: '3rem', color: T.sub, opacity: .3, mb: 2 }} />
          <Typography variant="h6" sx={{ color: T.text, fontWeight: 700, mb: 1 }}>No projects yet</Typography>
          <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>
            Track {dept?.name ?? 'department'} projects, timelines, and progress here.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}
            sx={{ borderColor: T.brand, color: T.brand }}>Add First Project</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(p => (
            <Paper key={p.id} sx={{ p: 3, bgcolor: T.card, border: `1px solid ${T.border}`,
              borderRadius: 2, transition: 'border-color .2s',
              '&:hover': { borderColor: `${statusColor[p.status]}60` } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>

                {/* Priority icon */}
                <Box sx={{ width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
                  bgcolor: `${priorityColor[p.priority]}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PriorityIcon p={p.priority} />
                </Box>

                {/* Name + desc */}
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem', fontFamily: T.font }}>{p.name}</Typography>
                    <Chip label={statusLabel[p.status]} size="small"
                      sx={{ bgcolor: `${statusColor[p.status]}18`, color: statusColor[p.status],
                        fontWeight: 700, fontSize: '.65rem', height: 20 }} />
                    <Chip label={p.priority} size="small"
                      sx={{ bgcolor: `${priorityColor[p.priority]}15`,
                        color: priorityColor[p.priority], fontWeight: 600, fontSize: '.65rem', height: 20 }} />
                  </Box>
                  {p.description && (
                    <Typography variant="body2" sx={{ color: T.sub, fontSize: '.82rem', mb: 1 }}>
                      {p.description}
                    </Typography>
                  )}
                  {/* Progress bar */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ flex: 1, height: 6, bgcolor: T.card2, borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${p.progress}%`,
                        bgcolor: statusColor[p.status], borderRadius: 3,
                        transition: 'width .4s ease' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: T.sub, minWidth: 32, textAlign: 'right' }}>
                      {p.progress}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {p.team && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <GroupsIcon sx={{ fontSize: '.8rem', color: T.sub }} />
                        <Typography variant="caption" sx={{ color: T.sub }}>{p.team}</Typography>
                      </Box>
                    )}
                    {p.lead && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: '.8rem', color: T.sub }} />
                        <Typography variant="caption" sx={{ color: T.sub }}>{p.lead}</Typography>
                      </Box>
                    )}
                    {p.dueDate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: '.8rem', color: T.sub }} />
                        <Typography variant="caption" sx={{ color: T.sub }}>
                          Due {new Date(p.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Add Project Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}` } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon sx={{ color: T.brand }} /> Add Project
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Project Name *" value={form.name ?? ''} autoFocus
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} size="small" />
          <TextField label="Description" value={form.description ?? ''} multiline rows={2}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} size="small" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Select value={form.status ?? 'ACTIVE'} size="small" fullWidth
              onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
              {(['ACTIVE','ON_HOLD','COMPLETED','CANCELLED'] as ProjectStatus[]).map(s =>
                <MenuItem key={s} value={s}>{statusLabel[s]}</MenuItem>)}
            </Select>
            <Select value={form.priority ?? 'MEDIUM'} size="small" fullWidth
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as ProjectPriority }))}>
              {(['HIGH','MEDIUM','LOW'] as ProjectPriority[]).map(p =>
                <MenuItem key={p} value={p}>{p[0] + p.slice(1).toLowerCase()} Priority</MenuItem>)}
            </Select>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Team" value={form.team ?? ''}
              onChange={e => setForm(f => ({ ...f, team: e.target.value }))} size="small" fullWidth />
            <TextField label="Lead" value={form.lead ?? ''}
              onChange={e => setForm(f => ({ ...f, lead: e.target.value }))} size="small" fullWidth />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField label="Due Date" type="date" value={form.dueDate ?? ''}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} size="small" fullWidth
              InputLabelProps={{ shrink: true }} />
            <TextField label="Progress %" type="number" value={form.progress ?? 0}
              onChange={e => setForm(f => ({ ...f, progress: Math.min(100, Math.max(0, Number(e.target.value))) }))} size="small" fullWidth
              inputProps={{ min: 0, max: 100 }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${T.border}` }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}
            sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 } }}>Add Project</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: Documents
// ═══════════════════════════════════════════════════════════════════════════════
type DocType = 'Policy' | 'Runbook' | 'Template' | 'Guide' | 'Report' | 'Other';

interface DeptDoc {
  id: string;
  title: string;
  description: string;
  type: DocType;
  author: string;
  url: string;
  updatedAt: string;
}

function DeptDocuments({ dept }: { dept: ApiDepartment | null }) {
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState<DocType | 'All'>('All');
  const [docView, setDocView]     = useState<'grid' | 'list'>('list');
  const [addOpen, setAddOpen]     = useState(false);
  const [docs, setDocs]           = useState<DeptDoc[]>([]);
  const [form, setForm]           = useState<Partial<DeptDoc>>({});

  const DOC_TYPES: DocType[] = ['Policy','Runbook','Template','Guide','Report','Other'];
  const typeColor: Record<DocType, string> = {
    Policy: T.red, Runbook: T.brand, Template: T.purple, Guide: T.blue, Report: T.green, Other: T.sub,
  };
  const docIcon = (t: DocType) => <InsertDriveFileIcon sx={{ fontSize: '1.2rem', color: typeColor[t] }} />;

  const filtered = docs.filter(d => {
    const matchType = typeFilter === 'All' || d.type === typeFilter;
    const q         = search.toLowerCase();
    const matchText = !q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
    return matchType && matchText;
  });

  const handleAdd = () => {
    if (!form.title?.trim()) return;
    setDocs(prev => [...prev, {
      id:          Date.now().toString(),
      title:       form.title!.trim(),
      description: form.description?.trim() ?? '',
      type:        (form.type as DocType) ?? 'Guide',
      author:      form.author?.trim() ?? '',
      url:         form.url?.trim() ?? '',
      updatedAt:   new Date().toISOString(),
    }]);
    setForm({});
    setAddOpen(false);
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search documents…" value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: '1 1 200px', '& input': { color: T.text }, '& .MuiOutlinedInput-root': { bgcolor: T.card2 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.sub, fontSize: '1rem' }} /></InputAdornment> }} />
        <Select value={typeFilter} size="small"
          onChange={e => setTypeFilter(e.target.value as DocType | 'All')}
          sx={{ minWidth: 130, bgcolor: T.card2, color: T.text }}>
          <MenuItem value="All">All types</MenuItem>
          {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>
        <Box sx={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 1.5, overflow: 'hidden' }}>
          {(['list','grid'] as const).map(v => (
            <Tooltip key={v} title={v === 'list' ? 'List view' : 'Grid view'}>
              <IconButton size="small" onClick={() => setDocView(v)}
                sx={{ borderRadius: 0, px: 1.25, py: 0.75,
                  bgcolor: docView === v ? `${T.brand}18` : 'transparent',
                  color:   docView === v ? T.brand : T.sub }}>
                {v === 'list' ? <ListIcon sx={{ fontSize: '1rem' }} /> : <GridViewIcon sx={{ fontSize: '1rem' }} />}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 }, borderRadius: 2 }}>
          Add Document
        </Button>
      </Box>

      {/* Type badge filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {['All', ...DOC_TYPES].map(t => (
          <Chip key={t} label={`${t}${t !== 'All' ? ` (${docs.filter(d => d.type === t).length})` : ''}`}
            size="small" clickable onClick={() => setTypeFilter(t as DocType | 'All')}
            sx={{ fontWeight: typeFilter === t ? 700 : 500,
              bgcolor: typeFilter === t ? (t === 'All' ? T.brand : typeColor[t as DocType]) : `${T.border}44`,
              color:   typeFilter === t ? '#fff' : T.sub }} />
        ))}
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <DescriptionIcon sx={{ fontSize: '3rem', color: T.sub, opacity: .3, mb: 2 }} />
          <Typography variant="h6" sx={{ color: T.text, fontWeight: 700, mb: 1 }}>No documents yet</Typography>
          <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>
            Add policies, runbooks, templates and guides for {dept?.name ?? 'this department'}.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}
            sx={{ borderColor: T.brand, color: T.brand }}>Add First Document</Button>
        </Box>
      ) : docView === 'list' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filtered.map(d => (
            <Paper key={d.id} sx={{ p: 2, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2,
              display: 'flex', alignItems: 'center', gap: 2,
              transition: 'border-color .15s', '&:hover': { borderColor: `${typeColor[d.type]}60` } }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: `${typeColor[d.type]}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {docIcon(d.type)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                  <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.9rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</Typography>
                  <Chip label={d.type} size="small"
                    sx={{ bgcolor: `${typeColor[d.type]}15`, color: typeColor[d.type],
                      fontWeight: 600, fontSize: '.65rem', height: 18, flexShrink: 0 }} />
                </Box>
                {d.description && (
                  <Typography variant="caption" sx={{ color: T.sub,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {d.description}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, alignItems: 'center' }}>
                {d.author && <Typography variant="caption" sx={{ color: T.sub }}>{d.author}</Typography>}
                <Typography variant="caption" sx={{ color: T.sub }}>
                  {new Date(d.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>
                {d.url && (
                  <IconButton size="small" onClick={() => window.open(d.url, '_blank')}
                    sx={{ color: T.sub, '&:hover': { color: T.brand } }}>
                    <LaunchIcon sx={{ fontSize: '.9rem' }} />
                  </IconButton>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
          {filtered.map(d => (
            <Paper key={d.id} sx={{ p: 2.5, bgcolor: T.card, border: `1px solid ${T.border}`,
              borderRadius: 2, borderTop: `3px solid ${typeColor[d.type]}`,
              transition: 'box-shadow .2s', '&:hover': { boxShadow: `0 4px 20px ${typeColor[d.type]}15` } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {docIcon(d.type)}
                <Chip label={d.type} size="small"
                  sx={{ bgcolor: `${typeColor[d.type]}15`, color: typeColor[d.type], fontWeight: 600, fontSize: '.65rem', height: 18 }} />
              </Box>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.9rem', mb: 0.5 }}>{d.title}</Typography>
              {d.description && (
                <Typography variant="caption" sx={{ color: T.sub, display: '-webkit-box',
                  overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>{d.description}</Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
                <Typography variant="caption" sx={{ color: T.sub }}>
                  {new Date(d.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Typography>
                {d.url && (
                  <IconButton size="small" onClick={() => window.open(d.url, '_blank')}
                    sx={{ color: T.sub, '&:hover': { color: T.brand } }}>
                    <LaunchIcon sx={{ fontSize: '.9rem' }} />
                  </IconButton>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Add Document Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}` } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon sx={{ color: T.brand }} /> Add Document
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Title *" value={form.title ?? ''} autoFocus
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} size="small" />
          <TextField label="Description" value={form.description ?? ''} multiline rows={2}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} size="small" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Select value={form.type ?? 'Guide'} size="small" fullWidth
              onChange={e => setForm(f => ({ ...f, type: e.target.value as DocType }))}>
              {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
            <TextField label="Author" value={form.author ?? ''}
              onChange={e => setForm(f => ({ ...f, author: e.target.value }))} size="small" fullWidth />
          </Box>
          <TextField label="URL / Link" value={form.url ?? ''}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))} size="small"
            placeholder="https://docs.example.com/..." />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${T.border}` }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}
            sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 } }}>Add Document</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: FAQs
// ═══════════════════════════════════════════════════════════════════════════════
interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

function DeptFAQs({ dept }: { dept: ApiDepartment | null }) {
  const [faqs, setFaqs]           = useState<FAQ[]>([]);
  const [openId, setOpenId]       = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [addOpen, setAddOpen]     = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<Partial<FAQ>>({});

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category).filter(Boolean)))];

  const filtered = faqs.filter(f => {
    const matchCat  = catFilter === 'All' || f.category === catFilter;
    const q         = search.toLowerCase();
    const matchText = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    return matchCat && matchText;
  });

  const handleSave = () => {
    if (!form.question?.trim() || !form.answer?.trim()) return;
    if (editId) {
      setFaqs(prev => prev.map(f => f.id === editId
        ? { ...f, question: form.question!.trim(), answer: form.answer!.trim(), category: form.category?.trim() ?? '' }
        : f));
      setEditId(null);
    } else {
      setFaqs(prev => [...prev, { id: Date.now().toString(),
        question: form.question!.trim(), answer: form.answer!.trim(), category: form.category?.trim() ?? '' }]);
    }
    setForm({});
    setAddOpen(false);
  };

  const startEdit = (f: FAQ) => {
    setForm({ question: f.question, answer: f.answer, category: f.category });
    setEditId(f.id);
    setAddOpen(true);
  };

  const deleteFaq = (id: string) => setFaqs(prev => prev.filter(f => f.id !== id));

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search FAQs…" value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: '1 1 200px', '& input': { color: T.text }, '& .MuiOutlinedInput-root': { bgcolor: T.card2 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.sub, fontSize: '1rem' }} /></InputAdornment> }} />
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => { setForm({}); setEditId(null); setAddOpen(true); }}
          sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 }, borderRadius: 2 }}>
          Add FAQ
        </Button>
      </Box>

      {/* Category chips */}
      {categories.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <Chip key={c} label={c} size="small" clickable onClick={() => setCatFilter(c)}
              sx={{ fontWeight: catFilter === c ? 700 : 500,
                bgcolor: catFilter === c ? T.brand : `${T.brand}10`,
                color:   catFilter === c ? '#fff' : T.sub }} />
          ))}
        </Box>
      )}

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <HelpOutlineIcon sx={{ fontSize: '3rem', color: T.sub, opacity: .3, mb: 2 }} />
          <Typography variant="h6" sx={{ color: T.text, fontWeight: 700, mb: 1 }}>No FAQs yet</Typography>
          <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>
            Add common questions and answers for {dept?.name ?? 'this department'}.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />}
            onClick={() => { setForm({}); setEditId(null); setAddOpen(true); }}
            sx={{ borderColor: T.brand, color: T.brand }}>Add First FAQ</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map((faq, idx) => (
            <Paper key={faq.id}
              sx={{ bgcolor: T.card, border: `1px solid ${openId === faq.id ? T.brand + '50' : T.border}`,
                borderRadius: 2, overflow: 'hidden', transition: 'border-color .2s' }}>

              {/* Question row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1,
                px: 2.5, py: 2, cursor: 'pointer' }}
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: `${T.brand}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography sx={{ color: T.brand, fontSize: '.72rem', fontWeight: 800 }}>{idx + 1}</Typography>
                </Box>
                <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.93rem',
                  flex: 1, fontFamily: T.font }}>
                  {faq.question}
                </Typography>
                {faq.category && (
                  <Chip label={faq.category} size="small"
                    sx={{ bgcolor: `${T.purple}15`, color: T.purple, fontWeight: 600,
                      fontSize: '.65rem', height: 18, flexShrink: 0 }} />
                )}
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0,
                  opacity: 0, '.MuiPaper-root:hover &': { opacity: 1 }, transition: 'opacity .15s' }}
                  onClick={e => e.stopPropagation()}>
                  <IconButton size="small" onClick={() => startEdit(faq)}
                    sx={{ color: T.sub, '&:hover': { color: T.brand } }}>
                    <EditIcon sx={{ fontSize: '.85rem' }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => deleteFaq(faq.id)}
                    sx={{ color: T.sub, '&:hover': { color: T.red } }}>
                    <DeleteIcon sx={{ fontSize: '.85rem' }} />
                  </IconButton>
                </Box>
                <Box sx={{ color: T.sub, display: 'flex' }}>
                  {openId === faq.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
              </Box>

              {/* Answer */}
              <Collapse in={openId === faq.id}>
                <Divider sx={{ borderColor: T.border }} />
                <Box sx={{ px: 3, py: 2.5, bgcolor: T.card2 }}>
                  <Typography sx={{ color: T.sub, lineHeight: 1.9, fontSize: '.88rem',
                    whiteSpace: 'pre-wrap' }}>
                    {faq.answer}
                  </Typography>
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Box>
      )}

      {/* Add / Edit FAQ Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}` } }}>
        <DialogTitle sx={{ color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlineIcon sx={{ color: T.brand }} /> {editId ? 'Edit FAQ' : 'Add FAQ'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Question *" value={form.question ?? ''} autoFocus
            onChange={e => setForm(f => ({ ...f, question: e.target.value }))} size="small" />
          <TextField label="Answer *" value={form.answer ?? ''} multiline rows={5}
            onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} size="small"
            placeholder="Write a clear, helpful answer…" />
          <TextField label="Category (optional)" value={form.category ?? ''}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))} size="small"
            placeholder="e.g. Onboarding, Policies, Tools…" />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${T.border}` }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: T.sub }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}
            sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 } }}>
            {editId ? 'Save Changes' : 'Add FAQ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: Contact
// ═══════════════════════════════════════════════════════════════════════════════
function DeptContact({ dept, members }: { dept: ApiDepartment | null; members: OrgMember[] }) {
  const leaders  = members.filter(m => m.role === 'OWNER' || m.role === 'ADMIN' || m.role === 'MANAGER');
  const roleColor: Record<string, string> = {
    OWNER: T.brand, ADMIN: T.blue, MANAGER: T.purple, MEMBER: T.green, VIEWER: T.sub,
  };

  // Contact form state
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent]       = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    // In production, wire to an API endpoint
    setSent(true);
    setName(''); setEmail(''); setSubject(''); setMessage('');
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>

      {/* ── Left: people ──────────────────────────────────────────────────── */}
      <Box sx={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Dept Lead hero */}
        <Paper sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.brand}, ${T.blue})` }} />
          <Box sx={{ p: 3 }}>
            <Typography sx={{ color: T.sub, fontWeight: 700, fontSize: '.72rem',
              letterSpacing: '.08em', textTransform: 'uppercase', mb: 1.5 }}>Department Lead</Typography>
            {dept?.department_lead ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: `${T.brand}22`, color: T.brand,
                  fontWeight: 800, fontSize: '1.3rem', border: `2px solid ${T.brand}44` }}>
                  {dept.department_lead[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1rem' }}>
                    {dept.department_lead}
                  </Typography>
                  <Typography variant="caption" sx={{ color: T.sub }}
                  >{dept.name} · Lead</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EmailIcon sx={{ fontSize: '.8rem', color: T.sub }} />
                      <Typography variant="caption" sx={{ color: T.sub }}>via org directory</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Typography sx={{ color: T.sub, fontSize: '.85rem' }}>No lead assigned.</Typography>
            )}
          </Box>
        </Paper>

        {/* Key contacts */}
        {leaders.length > 0 && (
          <Paper sx={{ p: 3, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <Typography sx={{ color: T.sub, fontWeight: 700, fontSize: '.72rem',
              letterSpacing: '.08em', textTransform: 'uppercase', mb: 2 }}>Key Contacts</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {leaders.map(m => {
                const rc       = roleColor[m.role] ?? T.sub;
                const initials = (m.name ?? m.email).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.75,
                    p: 1.5, bgcolor: T.card2, border: `1px solid ${T.border}`, borderRadius: 2,
                    transition: 'border-color .15s', '&:hover': { borderColor: `${rc}50` } }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: `${rc}20`, color: rc,
                      fontWeight: 800, fontSize: '.9rem', flexShrink: 0 }}>{initials}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.88rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name || m.email}
                        </Typography>
                        <Chip label={m.role} size="small"
                          sx={{ bgcolor: `${rc}18`, color: rc, fontWeight: 700,
                            fontSize: '.65rem', height: 18, flexShrink: 0 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: T.sub,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {m.email}
                      </Typography>
                    </Box>
                    <Tooltip title="Send email">
                      <IconButton size="small" href={`mailto:${m.email}`} component="a"
                        sx={{ color: T.sub, '&:hover': { color: T.brand } }}>
                        <EmailIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        )}

        {/* Office info card */}
        <Paper sx={{ p: 3, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2 }}>
          <Typography sx={{ color: T.sub, fontWeight: 700, fontSize: '.72rem',
            letterSpacing: '.08em', textTransform: 'uppercase', mb: 2 }}>Department Info</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {[
              { icon: <BadgeIcon sx={{ fontSize: '1rem' }} />,   label: 'Name',     value: dept?.name },
              { icon: <BuildIcon sx={{ fontSize: '1rem' }} />,   label: 'Category', value: dept?.category },
              { icon: <PersonIcon sx={{ fontSize: '1rem' }} />,  label: 'Lead',     value: dept?.department_lead },
              { icon: <GroupsIcon sx={{ fontSize: '1rem' }} />,  label: 'Teams',    value: String(dept?.teams?.length ?? 0) },
            ].filter(r => r.value).map(row => (
              <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ color: T.sub, display: 'flex', flexShrink: 0 }}>{row.icon}</Box>
                <Typography variant="caption" sx={{ color: T.sub, minWidth: 70 }}>{row.label}</Typography>
                <Typography variant="caption" sx={{ color: T.text, fontWeight: 600 }}>{row.value}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* ── Right: contact form ───────────────────────────────────────────── */}
      <Paper sx={{ flex: '1 1 320px', p: 3, bgcolor: T.card,
        border: `1px solid ${T.border}`, borderRadius: 2 }}>
        <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1.05rem',
          fontFamily: T.font, mb: 0.5 }}>Send a Message</Typography>
        <Typography variant="body2" sx={{ color: T.sub, mb: 3, fontSize: '.83rem' }}>
          Get in touch with the {dept?.name ?? 'department'} team directly.
        </Typography>

        {sent && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 2, mb: 2.5,
            bgcolor: `${T.green}12`, border: `1px solid ${T.green}40`, borderRadius: 2 }}>
            <CheckCircleIcon sx={{ color: T.green, fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ color: T.green, fontWeight: 600 }}>
              Message sent! The team will get back to you shortly.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Your Name *" value={name} onChange={e => setName(e.target.value)}
              size="small" fullWidth />
            <TextField label="Your Email *" value={email} onChange={e => setEmail(e.target.value)}
              size="small" fullWidth type="email" />
          </Box>
          <TextField label="Subject" value={subject} onChange={e => setSubject(e.target.value)}
            size="small" fullWidth placeholder="What's this about?" />
          <TextField label="Message *" value={message} onChange={e => setMessage(e.target.value)}
            multiline rows={5} size="small" fullWidth
            placeholder={`Hi ${dept?.name ?? 'team'}, I'd like to…`} />
          <Button variant="contained" startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim() || !message.trim()}
            sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 },
              alignSelf: 'flex-start', borderRadius: 2 }}>
            Send Message
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sub-view: Developer Workspaces
// ═══════════════════════════════════════════════════════════════════════════════
const WS_STATUS_CFG: Record<string, { label: string; color: string }> = {
  running:  { label: 'Running',  color: '#22c55e' },
  starting: { label: 'Starting', color: '#f59e0b' },
  stopping: { label: 'Stopping', color: '#f59e0b' },
  stopped:  { label: 'Stopped',  color: '#6b7280' },
  error:    { label: 'Error',    color: '#ef4444' },
};

function DeptDevWorkspaces({
  orgId, deptId, dept,
}: {
  orgId: string;
  deptId: string;
  dept: ApiDepartment | null;
}) {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<DevWorkspace[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyMap, setBusyMap]       = useState<Record<string, boolean>>({});
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [snack, setSnack]           = useState('');

  const load = useCallback(() => {
    setLoading(true);
    listDevWorkspaces()
      .then(setWorkspaces)
      .catch(() => setError('Failed to load workspaces.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setBusy = (id: string, val: boolean) =>
    setBusyMap(prev => ({ ...prev, [id]: val }));

  const handleStart = async (ws: DevWorkspace) => {
    setBusy(ws.workspace_id, true);
    try {
      const updated = await startDevWorkspace(ws.workspace_id);
      setWorkspaces(prev => prev.map(w => w.workspace_id === ws.workspace_id ? updated : w));
      setSnack(`"${ws.display_name}" started.`);
    } catch {
      setSnack('Failed to start workspace.');
    } finally { setBusy(ws.workspace_id, false); }
  };

  const handleStop = async (ws: DevWorkspace) => {
    setBusy(ws.workspace_id, true);
    try {
      const updated = await stopDevWorkspace(ws.workspace_id);
      setWorkspaces(prev => prev.map(w => w.workspace_id === ws.workspace_id ? updated : w));
      setSnack(`"${ws.display_name}" stopped.`);
    } catch {
      setSnack('Failed to stop workspace.');
    } finally { setBusy(ws.workspace_id, false); }
  };

  const filtered = workspaces.filter(ws => {
    const matchStatus = statusFilter === 'all' || ws.status === statusFilter;
    const q = search.toLowerCase();
    const matchText = !q || ws.display_name.toLowerCase().includes(q) || ws.workspace_id.toLowerCase().includes(q);
    return matchStatus && matchText;
  });

  const statusCounts = ['running', 'stopped', 'starting', 'error'].reduce<Record<string, number>>((acc, s) => {
    acc[s] = workspaces.filter(w => w.status === s).length;
    return acc;
  }, {});

  return (
    <Box>
      {/* Header toolbar */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search workspaces…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: '1 1 200px', '& input': { color: T.text }, '& .MuiOutlinedInput-root': { bgcolor: T.card2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: T.sub, fontSize: '1rem' }} />
              </InputAdornment>
            ),
          }}
        />
        <Select
          value={statusFilter}
          size="small"
          onChange={e => setStatusFilter(e.target.value)}
          sx={{ minWidth: 140, bgcolor: T.card2, color: T.text }}
        >
          <MenuItem value="all">All statuses</MenuItem>
          {['running', 'stopped', 'starting', 'stopping', 'error'].map(s => (
            <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
              {WS_STATUS_CFG[s]?.label ?? s}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 }, borderRadius: 2 }}
        >
          New Workspace
        </Button>
        <Tooltip title="Open Developer Dashboard">
          <IconButton size="small" onClick={() => navigate('/developer/Dashboard/workspace')}
            sx={{ color: T.sub, '&:hover': { color: T.text } }}>
            <OpenInNewIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Status summary pills */}
      {workspaces.length > 0 && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap' }}>
          {(['running', 'stopped', 'starting', 'error'] as string[]).map(s => (
            <Paper
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              sx={{
                px: 2, py: 1.25, bgcolor: T.card, cursor: 'pointer',
                border: `1px solid ${statusFilter === s ? WS_STATUS_CFG[s].color : T.border}`,
                borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70,
                transition: 'border-color .2s', '&:hover': { borderColor: WS_STATUS_CFG[s].color },
              }}
            >
              <Typography sx={{ color: WS_STATUS_CFG[s].color, fontWeight: 800, fontSize: '1.4rem', lineHeight: 1 }}>
                {statusCounts[s] ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ color: T.sub, textTransform: 'capitalize' }}>{s}</Typography>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Loading */}
      {loading && <LinearProgress sx={{ borderRadius: 2, mb: 2 }} />}

      {/* Error */}
      {error && (
        <Paper sx={{ p: 2, bgcolor: `${T.red}10`, border: `1px solid ${T.red}40`, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ color: T.red, fontSize: '.85rem' }}>{error}</Typography>
        </Paper>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <TerminalIcon sx={{ fontSize: '3rem', color: T.sub, opacity: .3, mb: 2 }} />
          <Typography variant="h6" sx={{ color: T.text, fontWeight: 700, mb: 1 }}>
            {workspaces.length === 0 ? 'No developer workspaces yet' : 'No workspaces match the filter'}
          </Typography>
          <Typography variant="body2" sx={{ color: T.sub, mb: 3 }}>
            {workspaces.length === 0
              ? `Create a cloud dev environment for the ${dept?.name ?? 'department'} team.`
              : 'Try adjusting the search or status filter.'}
          </Typography>
          {workspaces.length === 0 && (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
              sx={{ borderColor: T.brand, color: T.brand }}>
              Create First Workspace
            </Button>
          )}
        </Box>
      )}

      {/* Workspace list */}
      {!loading && filtered.length > 0 && (
        <Stack spacing={1.5}>
          {filtered.map(ws => {
            const cfg   = WS_STATUS_CFG[ws.status] ?? WS_STATUS_CFG.stopped;
            const busy  = !!busyMap[ws.workspace_id];
            const canStart = ws.status === 'stopped' || ws.status === 'error';
            const canStop  = ws.status === 'running' || ws.status === 'starting';

            return (
              <Paper
                key={ws.workspace_id}
                sx={{
                  p: 2.5, bgcolor: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 2, transition: 'border-color .2s',
                  '&:hover': { borderColor: `${cfg.color}55` },
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  {/* Icon */}
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
                    bgcolor: `${cfg.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TerminalIcon sx={{ fontSize: '1.2rem', color: cfg.color }} />
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '.95rem', fontFamily: T.font }}>
                        {ws.display_name}
                      </Typography>
                      <Chip
                        label={cfg.label}
                        size="small"
                        sx={{
                          bgcolor: `${cfg.color}18`, color: cfg.color,
                          fontWeight: 700, fontSize: '.65rem', height: 20,
                        }}
                      />
                      {ws.ide && (
                        <Chip
                          label={ws.ide}
                          size="small"
                          sx={{ bgcolor: `${T.brand}15`, color: T.brand, fontWeight: 600, fontSize: '.65rem', height: 20 }}
                        />
                      )}
                    </Stack>

                    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ color: T.sub, fontFamily: T.font }}>
                        ID: {ws.workspace_id}
                      </Typography>
                      {ws.region && (
                        <Typography variant="caption" sx={{ color: T.sub }}>
                          Region: {ws.region}
                        </Typography>
                      )}
                      {ws.owner && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <PersonIcon sx={{ fontSize: '.75rem', color: T.sub }} />
                          <Typography variant="caption" sx={{ color: T.sub }}>{ws.owner}</Typography>
                        </Box>
                      )}
                      {ws.image && (
                        <Typography variant="caption" sx={{ color: T.sub }}>
                          {ws.image}
                        </Typography>
                      )}
                    </Stack>

                    {/* CPU/RAM mini bars */}
                    {ws.status === 'running' && (
                      <Stack direction="row" spacing={2} sx={{ mt: 1.25 }}>
                        {([['CPU', ws.cpu_percent], ['RAM', ws.ram_percent]] as [string, number][]).map(([lbl, val]) => (
                          <Box key={lbl} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                            <Typography variant="caption" sx={{ color: T.sub, minWidth: 32 }}>{lbl}</Typography>
                            <Box sx={{ flex: 1, height: 5, bgcolor: T.card2, borderRadius: 3, overflow: 'hidden' }}>
                              <Box sx={{
                                height: '100%', width: `${val ?? 0}%`,
                                bgcolor: (val ?? 0) > 85 ? T.red : (val ?? 0) > 60 ? T.yellow : T.green,
                                borderRadius: 3, transition: 'width .4s',
                              }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: T.sub, minWidth: 28, textAlign: 'right' }}>
                              {val ?? 0}%
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
                    {canStart && (
                      <Tooltip title="Start workspace">
                        <span>
                          <IconButton size="small" disabled={busy} onClick={() => handleStart(ws)}
                            sx={{ color: T.green, '&:hover': { bgcolor: `${T.green}15` } }}>
                            <PlayArrowIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {canStop && (
                      <Tooltip title="Stop workspace">
                        <span>
                          <IconButton size="small" disabled={busy} onClick={() => handleStop(ws)}
                            sx={{ color: T.yellow, '&:hover': { bgcolor: `${T.yellow}15` } }}>
                            <StopIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {ws.status === 'running' && ws.editor_url && (
                      <Tooltip title="Open IDE">
                        <IconButton size="small" component="a" href={ws.editor_url} target="_blank"
                          sx={{ color: T.sub, '&:hover': { color: T.text } }}>
                          <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Workspace Dashboard">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/developer/Dashboard/workspace/${ws.workspace_id}`)}
                        sx={{ color: T.brand, '&:hover': { bgcolor: `${T.brand}15` } }}
                      >
                        <LaunchIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>

                {/* Busy progress bar */}
                {busy && <LinearProgress sx={{ mt: 1.5, borderRadius: 2 }} />}
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Workspace creation wizard (same as developer dashboard) */}
      <WorkspaceCreationWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setWorkspaces(prev => [created, ...prev]);
          setCreateOpen(false);
          setSnack(`Workspace "${created.display_name}" created.`);
        }}
      />

      {/* Snackbar */}
      {snack && (
        <Box
          sx={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            bgcolor: '#161b22', border: '1px solid #30363d', color: '#e6edf3',
            borderRadius: 2, px: 2.5, py: 1.25, fontSize: '.85rem', zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: 1,
          }}
          onClick={() => setSnack('')}
        >
          <CheckCircleIcon sx={{ color: T.green, fontSize: '1rem' }} />
          {snack}
        </Box>
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sidebar Editor Dialog
// ═══════════════════════════════════════════════════════════════════════════════
function SidebarEditorDialog({
  open, items, onClose, onSave,
}: {
  open: boolean;
  items: DeptSidebarItem[];
  onClose: () => void;
  onSave: (items: DeptSidebarItemWrite[]) => void;
}) {

  const [draft, setDraft] = useState<DeptSidebarItemWrite[]>([]);
  const [saving, setSaving] = useState(false);
  const dragIdx = useRef<number | null>(null);

  // Sync draft when dialog opens
  useEffect(() => {
    if (open) {
      setDraft(
        items.map(i => ({
          item_type:   i.item_type,
          label:       i.label,
          url:         i.url,
          icon:        i.icon,
          order_index: i.order_index,
          is_active:   i.is_active,
        }))
      );
    }
  }, [open, items]);

  const update = (idx: number, patch: Partial<DeptSidebarItemWrite>) =>
    setDraft(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));

  const removeItem = (idx: number) =>
    setDraft(prev => prev.filter((_, i) => i !== idx));

  const addItem = (type: SidebarItemType) =>
    setDraft(prev => [...prev, {
      item_type: type, label: 'New item', url: '', icon: 'LinkIcon',
      order_index: prev.filter(d => d.item_type === type).length,
      is_active: true,
    }]);

  // Drag reorder
  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDrop = (idx: number) => {
    if (dragIdx.current === null || dragIdx.current === idx) return;
    setDraft(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIdx.current!, 1);
      arr.splice(idx, 0, moved);
      return arr.map((d, i) => ({ ...d, order_index: i }));
    });
    dragIdx.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  };

  const TYPE_LABELS: Record<SidebarItemType, string> = {
    navigation: 'Navigation', action: 'Action',
    resource: 'Resource', highlight: 'Highlight', custom: 'Custom Link',
  };
  const TYPE_COLORS: Record<SidebarItemType, string> = {
    navigation: T.brand, action: T.green, resource: T.blue, highlight: T.yellow, custom: T.purple,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: T.card, border: `1px solid ${T.border}`, maxHeight: '90vh' } }}>
      <DialogTitle sx={{ color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TuneIcon sx={{ color: T.brand }} /> Customise Sidebar
      </DialogTitle>

      <DialogContent sx={{ pt: '4px !important' }}>
        <Typography variant="body2" sx={{ color: T.sub, mb: 2 }}>
          Drag to reorder · toggle to show/hide · add new items below.
        </Typography>

        {/* Item list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          {draft.map((item, idx) => (
            <Box key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.5, bgcolor: T.card2, border: `1px solid ${T.border}`,
                borderRadius: 2, cursor: 'grab', userSelect: 'none',
                '&:hover': { borderColor: T.brand + '60' } }}>
              <DragIndicatorIcon sx={{ color: T.sub, fontSize: '1.1rem', flexShrink: 0 }} />

              {/* Type badge */}
              <Chip label={TYPE_LABELS[item.item_type]}
                size="small"
                sx={{ bgcolor: `${TYPE_COLORS[item.item_type]}18`,
                  color: TYPE_COLORS[item.item_type], fontWeight: 700,
                  fontSize: '.65rem', height: 20, flexShrink: 0, width: 82, justifyContent: 'center' }} />

              {/* Icon picker */}
              <Select value={item.icon || 'LinkIcon'} size="small"
                onChange={e => update(idx, { icon: e.target.value as string })}
                sx={{ minWidth: 50, height: 30, color: T.text, fontSize: '.78rem',
                  bgcolor: T.bg, border: `1px solid ${T.border}`, '.MuiOutlinedInput-notchedOutline': { border: 'none' } }}>
                {ICON_OPTIONS.map(ic => (
                  <MenuItem key={ic} value={ic} sx={{ fontSize: '.78rem' }}>{ic.replace('Icon', '')}</MenuItem>
                ))}
              </Select>

              {/* Label */}
              <TextField value={item.label} size="small"
                onChange={e => update(idx, { label: e.target.value })}
                placeholder="Label"
                sx={{ flex: 1, '& input': { color: T.text, fontSize: '.82rem', py: 0.6 },
                  '& .MuiOutlinedInput-root': { bgcolor: T.bg } }} />

              {/* URL (for non-navigation) */}
              {item.item_type !== 'navigation' && (
                <TextField value={item.url} size="small"
                  onChange={e => update(idx, { url: e.target.value })}
                  placeholder="URL"
                  sx={{ flex: 1, '& input': { color: T.text, fontSize: '.82rem', py: 0.6 },
                    '& .MuiOutlinedInput-root': { bgcolor: T.bg } }} />
              )}

              {/* Active toggle */}
              <Tooltip title={item.is_active ? 'Visible' : 'Hidden'}>
                <Switch checked={item.is_active} size="small"
                  onChange={e => update(idx, { is_active: e.target.checked })}
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: item.is_active ? T.brand : T.sub } }} />
              </Tooltip>

              <IconButton size="small" onClick={() => removeItem(idx)}
                sx={{ color: T.sub, '&:hover': { color: T.red } }}>
                <DeleteIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Box>
          ))}
        </Box>

        {/* Add item buttons */}
        <Box>
          <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 1 }}>
            Add new item:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(['action', 'resource', 'highlight', 'custom'] as SidebarItemType[]).map(type => (
              <Button key={type} size="small" startIcon={<AddIcon sx={{ fontSize: '.8rem' }} />}
                onClick={() => addItem(type)}
                sx={{ color: TYPE_COLORS[type], borderColor: `${TYPE_COLORS[type]}40`,
                  border: '1px solid', borderRadius: 1.5, fontSize: '.75rem', textTransform: 'none',
                  '&:hover': { bgcolor: `${TYPE_COLORS[type]}12` } }}>
                {TYPE_LABELS[type]}
              </Button>
            ))}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${T.border}` }}>
        <Button onClick={onClose} sx={{ color: T.sub }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.brand, opacity: .85 } }}>
          {saving ? 'Saving…' : 'Save sidebar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
