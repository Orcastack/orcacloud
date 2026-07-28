// OrcaCloud — Enterprise Developer Workspace Dashboard
// Full-screen cockpit: header / GitLab-sidebar / hard-tab center / collapsible right panel

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, IconButton, InputLabel,
  LinearProgress, List, ListItemButton, ListItemText,
  MenuItem, Select, Snackbar, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import AccountTreeIcon         from '@mui/icons-material/AccountTree';
import AddIcon                from '@mui/icons-material/Add';
import AppsIcon               from '@mui/icons-material/Apps';
import CloudIcon              from '@mui/icons-material/Cloud';
import DnsIcon                from '@mui/icons-material/Dns';
import GroupsIcon             from '@mui/icons-material/Groups';
import ArrowBackIcon          from '@mui/icons-material/ArrowBack';
import ArticleIcon            from '@mui/icons-material/Article';
import BarChartIcon           from '@mui/icons-material/BarChart';
import CheckCircleIcon        from '@mui/icons-material/CheckCircle';
import ChevronRightIcon       from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon        from '@mui/icons-material/ChevronLeft';
import CloseIcon              from '@mui/icons-material/Close';
import CodeIcon               from '@mui/icons-material/Code';
import DashboardIcon          from '@mui/icons-material/Dashboard';
import DeleteOutlineIcon      from '@mui/icons-material/DeleteOutline';
import DevicesIcon            from '@mui/icons-material/Devices';
import ErrorOutlineIcon       from '@mui/icons-material/ErrorOutline';
import FolderOpenIcon         from '@mui/icons-material/FolderOpen';
import HubIcon                from '@mui/icons-material/Hub';
import LayersIcon             from '@mui/icons-material/Layers';
import LinkIcon               from '@mui/icons-material/Link';
import LockIcon               from '@mui/icons-material/Lock';
import MemoryIcon             from '@mui/icons-material/Memory';
import NotificationsNoneIcon  from '@mui/icons-material/NotificationsNone';
import OpenInNewIcon          from '@mui/icons-material/OpenInNew';
import PlayArrowIcon          from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon  from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon            from '@mui/icons-material/Refresh';
import RocketLaunchIcon       from '@mui/icons-material/RocketLaunch';
import SaveIcon               from '@mui/icons-material/Save';
import SettingsIcon           from '@mui/icons-material/Settings';
import StopIcon               from '@mui/icons-material/Stop';
import StorageIcon            from '@mui/icons-material/Storage';
import TerminalIcon           from '@mui/icons-material/Terminal';
import TuneIcon               from '@mui/icons-material/Tune';
import ViewTimelineIcon       from '@mui/icons-material/ViewTimeline';
import WarningAmberIcon       from '@mui/icons-material/WarningAmber';
import { useNavigate, useParams } from 'react-router-dom';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';
import {
  getDevWorkspace, startDevWorkspace, stopDevWorkspace,
  restartDevWorkspace, deleteDevWorkspace, updateDevWorkspace,
  getWorkspaceGroupSidebar,
  type DevWorkspace,
} from '../services/devWorkspaceApi';
import WorkspaceSetupWizard, { type WorkspaceSetupWizardResult } from '../components/Workspace/WorkspaceSetupWizard';
import {
  listProjects, listProjectRepos, createStandaloneRepo, listReposByWorkspace,
  type BackendProject, type BackendRepository,
} from '../services/projectsApi';
import {
  listEnvironments, createEnvironment,
  type ApiEnvironment, type CreateEnvironmentPayload,
} from '../services/environmentsApi';
import {
  listGroups, createGroup,
  type Group,
  type GroupType,
  type GroupVisibility,
  type GroupSidebarData,
} from '../services/groupsApi';
import { useGroupPermissions } from '../hooks/useGroupPermissions';
import { PermissionGate } from '../components/PermissionGate';
import {
  listClusters, createCluster,
  K8S_VERSIONS, CLUSTER_REGIONS,
} from '../services/clustersApi';

const FONT = dashboardTokens.typography.fontFamily;
const t    = dashboardTokens.colors;

// ── Section definitions ────────────────────────────────────────────────────────
type Section =
  | 'overview' | 'ide' | 'terminal' | 'pipelines'
  | 'deployments' | 'metrics' | 'logs' | 'secrets'
  | 'env-vars' | 'settings'
  | 'sessions' | 'tools'
  | 'containers' | 'kubernetes' | 'groups' | 'environments' | 'projects' | 'repositories'
  | 'workspace-setup'
  | 'connect-project' | 'connect-env' | 'trigger-pipeline';

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ReactNode; dividerBefore?: boolean }[] = [
  { id: 'overview',          label: 'Overview',           icon: <DashboardIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'ide',               label: 'IDE',                icon: <CodeIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'terminal',          label: 'Terminal',            icon: <TerminalIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'sessions',          label: 'Sessions',            icon: <DevicesIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'tools',             label: 'Tools',               icon: <TuneIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'projects',          label: 'Projects',            icon: <FolderOpenIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'repositories',      label: 'Repositories',        icon: <StorageIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'pipelines',         label: 'CI/CD Pipelines',     icon: <PlayCircleOutlineIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'containers',        label: 'Containers',          icon: <AppsIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'kubernetes',        label: 'Kubernetes',          icon: <CloudIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'environments',      label: 'Environments',        icon: <DnsIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'groups',            label: 'Groups',              icon: <GroupsIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'deployments',       label: 'Deployments',         icon: <RocketLaunchIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'metrics',           label: 'Metrics',             icon: <BarChartIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'logs',              label: 'Logs',                icon: <ArticleIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'secrets',           label: 'Secrets',             icon: <LockIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'env-vars',          label: 'Environment Vars',    icon: <LayersIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'settings',          label: 'Settings',            icon: <SettingsIcon sx={{ fontSize: '1.1rem' }} /> },
  // ── Integration flow ────────────────────────────────────────────────────
  { id: 'workspace-setup',   label: 'Workspace Setup',     icon: <TuneIcon sx={{ fontSize: '1.1rem' }} />, dividerBefore: true },
  { id: 'connect-project',   label: 'Connect Project',     icon: <AccountTreeIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'connect-env',       label: 'Connect Environment', icon: <LinkIcon sx={{ fontSize: '1.1rem' }} /> },
  { id: 'trigger-pipeline',  label: 'Trigger Pipeline',    icon: <ViewTimelineIcon sx={{ fontSize: '1.1rem' }} /> },
];

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  running:  { label: 'Running',  color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.14)',  dot: dashboardSemanticColors.success },
  starting: { label: 'Starting', color: dashboardSemanticColors.warning, bg: 'rgba(251,191,36,.14)', dot: dashboardSemanticColors.warning },
  stopping: { label: 'Stopping', color: dashboardSemanticColors.warning, bg: 'rgba(251,191,36,.14)', dot: dashboardSemanticColors.warning },
  stopped:  { label: 'Stopped',  color: t.textSecondary,                 bg: 'rgba(107,114,128,.12)', dot: t.textTertiary },
  error:    { label: 'Error',    color: dashboardSemanticColors.danger,  bg: 'rgba(239,68,68,.14)',  dot: dashboardSemanticColors.danger },
};

// ── Metric bar ─────────────────────────────────────────────────────────────────
function MetricBar({ label, value, unit = '%', maxWidth }: { label: string; value: number; unit?: string; maxWidth?: number }) {
  const color = value > 80 ? dashboardSemanticColors.danger
              : value > 60 ? dashboardSemanticColors.warning
              : dashboardSemanticColors.success;
  return (
    <Box sx={{ width: '100%', ...(maxWidth ? { maxWidth } : {}) }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
        <Typography sx={{ fontSize: '.7rem', color: t.textSecondary }}>{label}</Typography>
        <Typography sx={{ fontSize: '.7rem', color, fontWeight: 700 }}>{value}{unit}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={Math.min(value, 100)}
        sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,.07)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }} />
    </Box>
  );
}

// ── Dummy log lines ────────────────────────────────────────────────────────────
const LOG_LEVELS = ['INFO', 'INFO', 'INFO', 'WARN', 'DEBUG', 'ERROR', 'INFO'];
const LOG_MSGS   = [
  'Workspace container started successfully.',
  'Mounting persistent volume /workspace …',
  'Injecting secrets from vault.',
  'CPU usage above 70% — consider upgrading resources.',
  'Health check: /ping → 200 OK',
  'Kernel OOM killer triggered. Process node exited.',
  'VS Code server listening on :8443',
];

// ── Interactive terminal ─────────────────────────────────────────────────────
type TermLine = { type: 'prompt' | 'output' | 'error' | 'info'; text: string };

function buildFS(): Record<string, string[]> {
  return {
    '/workspace':         ['src/', 'public/', 'package.json', 'README.md', '.env', 'Dockerfile'],
    '/workspace/src':     ['index.ts', 'app.ts', 'routes/', 'models/', 'utils/'],
    '/workspace/public':  ['index.html', 'favicon.ico', 'assets/'],
  };
}

function simulateCommand(cmd: string, cwd: string, workspaceId: string, image: string, ide: string, region: string): { output: TermLine[]; newCwd: string } {
  const fs = buildFS();
  const parts = cmd.trim().split(/\s+/);
  const bin   = parts[0];
  const args  = parts.slice(1);

  switch (bin) {
    case '': return { output: [], newCwd: cwd };

    case 'clear': return { output: [{ type: 'info', text: '\x1b[CLEAR]' }], newCwd: cwd };

    case 'pwd': return { output: [{ type: 'output', text: cwd }], newCwd: cwd };

    case 'whoami': return { output: [{ type: 'output', text: workspaceId }], newCwd: cwd };

    case 'hostname': return { output: [{ type: 'output', text: `${workspaceId}.orcacloud-workspace` }], newCwd: cwd };

    case 'uname': return { output: [{ type: 'output', text: 'Linux orcacloud-workspace 6.6.0-orcacloud #1 SMP x86_64 GNU/Linux' }], newCwd: cwd };

    case 'echo': return { output: [{ type: 'output', text: args.join(' ').replace(/^"|"$/g, '').replace(/^'|'$/g, '') }], newCwd: cwd };

    case 'ls': {
      const target = args[0] ? (args[0].startsWith('/') ? args[0] : `${cwd}/${args[0]}`.replace('//', '/')) : cwd;
      const entries = fs[target];
      if (!entries) return { output: [{ type: 'error', text: `ls: cannot access '${args[0] || target}': No such file or directory` }], newCwd: cwd };
      return { output: [{ type: 'output', text: entries.join('  ') }], newCwd: cwd };
    }

    case 'cd': {
      if (!args[0] || args[0] === '~') return { output: [], newCwd: '/workspace' };
      const target = args[0].startsWith('/') ? args[0] : `${cwd}/${args[0]}`.replace('//', '/');
      if (fs[target] !== undefined || Object.keys(fs).some((k) => k.startsWith(target + '/'))) {
        return { output: [], newCwd: target };
      }
      return { output: [{ type: 'error', text: `bash: cd: ${args[0]}: No such file or directory` }], newCwd: cwd };
    }

    case 'cat': {
      if (!args[0]) return { output: [{ type: 'error', text: 'cat: missing operand' }], newCwd: cwd };
      const name = args[0].replace(/^.*\//, '');
      if (name === 'package.json') return { output: [{ type: 'output', text: `{\n  "name": "${workspaceId}",\n  "version": "1.0.0",\n  "private": true\n}` }], newCwd: cwd };
      if (name === 'README.md')    return { output: [{ type: 'output', text: `# ${workspaceId}\n\nOrcaCloud workspace project.` }], newCwd: cwd };
      if (name === '.env')         return { output: [{ type: 'output', text: `NODE_ENV=development\nPORT=3000\nLOG_LEVEL=debug` }], newCwd: cwd };
      if (name === 'Dockerfile')   return { output: [{ type: 'output', text: `FROM ${image}\nWORKDIR /workspace\nCOPY . .\nRUN npm install\nCMD ["npm", "start"]` }], newCwd: cwd };
      return { output: [{ type: 'error', text: `cat: ${args[0]}: No such file or directory` }], newCwd: cwd };
    }

    case 'env': return {
      output: [
        { type: 'output', text: `NODE_ENV=development` },
        { type: 'output', text: `PORT=3000` },
        { type: 'output', text: `WORKSPACE_ID=${workspaceId}` },
        { type: 'output', text: `IMAGE=${image}` },
        { type: 'output', text: `IDE=${ide}` },
        { type: 'output', text: `REGION=${region}` },
        { type: 'output', text: `HOME=/workspace` },
        { type: 'output', text: `SHELL=/bin/bash` },
      ],
      newCwd: cwd,
    };

    case 'node': {
      if (args[0] === '--version' || args[0] === '-v') return { output: [{ type: 'output', text: 'v20.11.0' }], newCwd: cwd };
      return { output: [{ type: 'info', text: 'Welcome to Node.js v20.11.0. (Type .exit to quit)' }], newCwd: cwd };
    }

    case 'python3': {
      if (args[0] === '--version' || args[0] === '-V') return { output: [{ type: 'output', text: 'Python 3.12.1' }], newCwd: cwd };
      return { output: [{ type: 'info', text: 'Python 3.12.1. (Type exit() to quit)' }], newCwd: cwd };
    }

    case 'git': {
      if (args[0] === 'status') return { output: [
        { type: 'output', text: 'On branch main' },
        { type: 'output', text: "Your branch is up to date with 'origin/main'." },
        { type: 'output', text: '' },
        { type: 'output', text: 'nothing to commit, working tree clean' },
      ], newCwd: cwd };
      if (args[0] === 'log' || args[0] === '--oneline') return { output: [
        { type: 'output', text: 'a1b2c3d feat: initial workspace setup' },
        { type: 'output', text: 'e4f5a6b chore: add Dockerfile and .env' },
      ], newCwd: cwd };
      if (args[0] === 'branch') return { output: [{ type: 'output', text: '* main' }], newCwd: cwd };
      return { output: [{ type: 'output', text: `git: '${args[0]}' — command executed` }], newCwd: cwd };
    }

    case 'npm': {
      if (args[0] === '--version' || args[0] === '-v') return { output: [{ type: 'output', text: '10.2.4' }], newCwd: cwd };
      if (args[0] === 'install' || args[0] === 'i')   return { output: [{ type: 'info', text: 'added 342 packages in 4.1s' }], newCwd: cwd };
      if (args[0] === 'run' && args[1])               return { output: [{ type: 'info', text: `> ${workspaceId}@1.0.0 ${args[1]}\n> node dist/${args[1]}.js` }], newCwd: cwd };
      return { output: [{ type: 'output', text: `npm: '${args[0]}' — executed` }], newCwd: cwd };
    }

    case 'ps': return { output: [
      { type: 'output', text: '  PID TTY          TIME CMD' },
      { type: 'output', text: '    1 ?        00:00:01 bash' },
      { type: 'output', text: '   42 ?        00:00:11 node' },
      { type: 'output', text: '   99 ?        00:00:03 vscode-server' },
    ], newCwd: cwd };

    case 'df': return { output: [
      { type: 'output', text: 'Filesystem      Size  Used Avail Use% Mounted on' },
      { type: 'output', text: 'overlay          50G   17G   33G  34% /' },
      { type: 'output', text: 'tmpfs            64M     0   64M   0% /dev' },
    ], newCwd: cwd };

    case 'free': return { output: [
      { type: 'output', text: '              total        used        free' },
      { type: 'output', text: 'Mem:        4096000     2048000     2048000' },
      { type: 'output', text: 'Swap:             0           0           0' },
    ], newCwd: cwd };

    case 'help': return { output: [
      { type: 'info', text: 'Available commands:' },
      { type: 'output', text: '  ls, cd, pwd, cat, echo, env, ps, df, free' },
      { type: 'output', text: '  git, node, npm, python3' },
      { type: 'output', text: '  whoami, hostname, uname, clear, help' },
    ], newCwd: cwd };

    default:
      return { output: [{ type: 'error', text: `bash: ${bin}: command not found` }], newCwd: cwd };
  }
}

interface InteractiveTerminalProps {
  workspaceId: string;
  image: string;
  ide: string;
  region: string;
  isRunning: boolean;
  onStart: () => void;
  actionBusy: boolean;
}

function InteractiveTerminal({ workspaceId, image, ide, region, isRunning, onStart, actionBusy }: InteractiveTerminalProps) {
  const [lines, setLines]   = useState<TermLine[]>([
    { type: 'info', text: `OrcaCloud Developer Workspace — ${workspaceId}` },
    { type: 'info', text: `Image: ${image}  |  IDE: ${ide}  |  Region: ${region}` },
    { type: 'info', text: 'Type \'help\' for available commands.' },
    { type: 'info', text: '' },
  ]);
  const [input, setInput]       = useState('');
  const [cwd, setCwd]           = useState('/workspace');
  const [history, setHistory]   = useState<string[]>([]);
  const [_histIdx, setHistIdx]   = useState(-1);
  const [focused, setFocused]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);
  const scrollRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const focusInput = () => { inputRef.current?.focus(); setFocused(true); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = input.trim();
      const promptLine: TermLine = { type: 'prompt', text: `${workspaceId}@orcacloud:${cwd}$ ${cmd}` };
      if (cmd === '') { setLines((l) => [...l, promptLine]); setInput(''); return; }

      const result = simulateCommand(cmd, cwd, workspaceId, image, ide, region);
      const isClear = result.output.some((o) => o.text === '\x1b[CLEAR]');

      if (isClear) {
        setLines([]);
      } else {
        setLines((l) => [...l, promptLine, ...result.output]);
      }
      setCwd(result.newCwd);
      setHistory((h) => [cmd, ...h.slice(0, 99)]);
      setHistIdx(-1);
      setInput('');
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistIdx((i) => {
        const next = Math.min(i + 1, history.length - 1);
        setInput(history[next] ?? '');
        return next;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistIdx((i) => {
        const next = i - 1;
        if (next < 0) { setInput(''); return -1; }
        setInput(history[next] ?? '');
        return next;
      });
    } else if (e.key === 'c' && e.ctrlKey) {
      setLines((l) => [...l, { type: 'prompt', text: `${workspaceId}@orcacloud:${cwd}$ ${input}^C` }]);
      setInput('');
      setHistIdx(-1);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const prompt = `${workspaceId}@orcacloud:${cwd}$`;

  if (!isRunning) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, bgcolor: '#1e1e2e' }}>
        <TerminalIcon sx={{ fontSize: '2.5rem', color: '#6c7086' }} />
        <Typography sx={{ fontWeight: 700, color: '#cdd6f4', fontFamily: 'monospace' }}>Workspace not running</Typography>
        <Typography sx={{ color: '#6c7086', fontSize: '.85rem', fontFamily: 'monospace' }}>Start the workspace to access the terminal.</Typography>
        <Button variant="contained" size="small" startIcon={actionBusy ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <PlayArrowIcon />}
          onClick={onStart} disabled={actionBusy}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#153d75', '&:hover': { bgcolor: '#1a4f9a' }, borderRadius: '8px', mt: 1 }}>
          Start Workspace
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1e1e2e', cursor: 'text' }} onClick={focusInput}>
      {/* Toolbar */}
      <Box sx={{ px: 2, py: 0.75, bgcolor: '#181825', borderBottom: '1px solid #313244', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {['#ef5350', '#ffa726', '#66bb6a'].map((c) => (
          <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
        ))}
        <Typography sx={{ fontSize: '.72rem', color: '#6c7086', ml: 1, fontFamily: 'monospace', flex: 1 }}>
          bash — {workspaceId}@orcacloud-workspace
        </Typography>
        <Tooltip title="Clear terminal (Ctrl+L)">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setLines([]); }}
            sx={{ color: '#6c7086', '&:hover': { color: '#cdd6f4' }, p: 0.5 }}>
            <CloseIcon sx={{ fontSize: '.85rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Output area */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 1.5, fontFamily: 'monospace', fontSize: '.8rem', lineHeight: 1.65,
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#45475a', borderRadius: 3 },
      }}>
        {lines.map((ln, i) => (
          <Box key={i} component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: ln.type === 'prompt' ? '#89b4fa'
                 : ln.type === 'error'  ? '#f38ba8'
                 : ln.type === 'info'   ? '#a6e3a1'
                 : '#cdd6f4',
          }}>{ln.text}</Box>
        ))}

        {/* Active input row */}
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25 }}>
          <Box component="span" sx={{ color: focused ? '#89dceb' : '#89b4fa', mr: 0.75, userSelect: 'none', flexShrink: 0 }}>
            {prompt}
          </Box>
          <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            {/* Rendered input text + cursor */}
            <Box component="span" sx={{ color: '#cdd6f4', fontFamily: 'monospace', fontSize: 'inherit', pointerEvents: 'none', whiteSpace: 'pre' }}>
              {input}
            </Box>
            {focused && (
              <Box component="span" sx={{ display: 'inline-block', width: '0.55em', height: '1.1em', bgcolor: '#cdd6f4',
                verticalAlign: 'text-bottom', ml: '1px',
                animation: 'atxBlink 1s step-end infinite',
                '@keyframes atxBlink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
              }} />
            )}
            {/* Invisible real input */}
            <Box component="input" ref={inputRef as any}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoComplete="off" autoCorrect="off" spellCheck={false}
              sx={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
                opacity: 0, border: 'none', outline: 'none', background: 'transparent',
                fontFamily: 'monospace', fontSize: 'inherit', color: 'transparent',
                caretColor: 'transparent', cursor: 'text',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Integration context types ─────────────────────────────────────────────────
interface ConnectedProject {
  id: string;
  name: string;
  project_key: string;
  repo_count: number;
  last_activity: string | null;
  description: string;
}
interface ConnectedEnv {
  id: string;
  name: string;       // dev | staging | production
  health: 'healthy' | 'degraded' | 'down';
  version: string;
  lastDeploy: string;
  errorRate: string;
}
interface RunningPipeline {
  id: string;
  name: string;
  branch: string;
  status: 'running' | 'passed' | 'failed';
  startedAt: string;
}

const PIPELINE_FILES = ['orcacloud.yml', 'atonix.yml', '.gitlab-ci.yml', 'pipeline.yaml', 'Jenkinsfile', '.github/workflows/ci.yml'];

// ── Project selection modal ───────────────────────────────────────────────────
function ProjectSelectModal({
  open, onClose, onSelect,
}: { open: boolean; onClose: () => void; onSelect: (p: BackendProject) => void }) {
  const [projects, setProjects]  = useState<BackendProject[]>([]);
  const [loading, setLoading]    = useState(false);
  const [search, setSearch]      = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listProjects().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.project_key.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AccountTreeIcon sx={{ fontSize: '1.1rem', color: t.brandPrimary }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>Connect Project</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: t.textSecondary }}><CloseIcon sx={{ fontSize: '1rem' }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <TextField fullWidth size="small" placeholder="Search projects…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 1.5, '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }} />
        {loading ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} sx={{ color: t.brandPrimary }} /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ color: t.textSecondary, fontSize: '.875rem' }}>No projects found.</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {filtered.map((p) => (
              <ListItemButton key={p.id} onClick={() => { onSelect(p); onClose(); }}
                sx={{ borderRadius: '10px', mb: 0.5, border: `1px solid ${t.border}`,
                  '&:hover': { bgcolor: 'rgba(21,61,117,.1)', borderColor: t.brandPrimary } }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: p.avatar_color || t.brandPrimary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5, flexShrink: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '.78rem', color: '#fff' }}>{p.name[0]?.toUpperCase()}</Typography>
                </Box>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 700, fontSize: '.875rem', color: t.textPrimary }}>{p.name}</Typography>}
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: 'monospace' }}>{p.project_key}</Typography>
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>·</Typography>
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>{p.repo_count} repo{p.repo_count !== 1 ? 's' : ''}</Typography>
                    </Stack>
                  }
                />
                <ChevronRightIcon sx={{ fontSize: '1rem', color: t.textTertiary }} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Environment selection modal ───────────────────────────────────────────────
function EnvSelectModal({
  open, project, onClose, onSelect,
}: { open: boolean; project: ConnectedProject | null; onClose: () => void; onSelect: (e: ConnectedEnv) => void }) {
  const [envs, setEnvs]       = useState<ApiEnvironment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !project) return;
    setLoading(true);
    listEnvironments(project.id)
      .then(list => setEnvs(Array.isArray(list) ? list : []))
      .catch(() => setEnvs([]))
      .finally(() => setLoading(false));
  }, [open, project]);

  const toConnectedEnv = (e: ApiEnvironment): ConnectedEnv => ({
    id:         e.id,
    name:       e.name,
    health:     'healthy',
    version:    '—',
    lastDeploy: e.updated_at ? new Date(e.updated_at).toLocaleDateString() : '—',
    errorRate:  '—',
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LinkIcon sx={{ fontSize: '1.1rem', color: t.brandPrimary }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>Connect Environment</Typography>
          {project && <Chip label={project.name} size="small" sx={{ bgcolor: 'rgba(21,61,117,.14)', color: t.brandPrimary, fontWeight: 700, fontSize: '.7rem' }} />}
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: t.textSecondary }}><CloseIcon sx={{ fontSize: '1rem' }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {!project ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', mb: 1.5 }}>Connect a project first to select an environment.</Typography>
          </Box>
        ) : loading ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} sx={{ color: t.brandPrimary }} /></Box>
        ) : (
          <>
            <Typography sx={{ color: t.textSecondary, fontSize: '.82rem', mb: 1.5 }}>
              Select the environment to attach to this workspace session.
            </Typography>
            <Stack spacing={1}>
              {envs.length === 0 && (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: t.textSecondary, fontSize: '.875rem' }}>No environments found for this project.</Typography>
                </Box>
              )}
              {envs.map((apiEnv) => {
                const env = toConnectedEnv(apiEnv);
                const healthColor = env.health === 'healthy' ? dashboardSemanticColors.success
                                  : env.health === 'degraded' ? dashboardSemanticColors.warning
                                  : dashboardSemanticColors.danger;
                return (
                  <Box key={env.id} onClick={() => { onSelect(env); onClose(); }}
                    sx={{ p: 2, borderRadius: '10px', border: `1px solid ${t.border}`, cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(21,61,117,.08)', borderColor: t.brandPrimary } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: healthColor, flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '.875rem', color: t.textPrimary }}>{env.name}</Typography>
                          <Stack direction="row" spacing={1}>
                            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                              {apiEnv.deployment_strategy} · {apiEnv.region || 'no region'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <Chip size="small" label={apiEnv.is_protected ? 'Protected' : 'Open'}
                        sx={{ fontWeight: 700, fontSize: '.7rem',
                          bgcolor: apiEnv.is_protected ? 'rgba(239,68,68,.1)' : 'rgba(34,197,94,.12)',
                          color: apiEnv.is_protected ? dashboardSemanticColors.danger : dashboardSemanticColors.success }} />
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Pipeline trigger modal ────────────────────────────────────────────────────
function TriggerPipelineModal({
  open, project, onClose, onTriggered,
}: { open: boolean; project: ConnectedProject | null; onClose: () => void; onTriggered: (p: RunningPipeline) => void }) {
  const [repos, setRepos]             = useState<BackendRepository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<BackendRepository | null>(null);
  const [branch, setBranch]           = useState('main');
  const [pipeline, setPipeline]       = useState('');
  const [triggering, setTriggering]   = useState(false);

  useEffect(() => {
    if (!open || !project) return;
    setSelectedRepo(null); setPipeline(''); setBranch('main');
    setLoadingRepos(true);
    listProjectRepos(project.id).then(setRepos).catch(() => setRepos([])).finally(() => setLoadingRepos(false));
  }, [open, project]);

  const detectedPipelines = selectedRepo
    ? PIPELINE_FILES.filter((_, i) => i < (selectedRepo.repo_name.length % 3) + 1)
    : [];

  const handleTrigger = () => {
    if (!pipeline || !selectedRepo) return;
    setTriggering(true);
    setTimeout(() => {
      const run: RunningPipeline = {
        id: Date.now().toString(),
        name: pipeline,
        branch,
        status: 'running',
        startedAt: new Date().toISOString(),
      };
      onTriggered(run);
      setTriggering(false);
      onClose();
    }, 900);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ViewTimelineIcon sx={{ fontSize: '1.1rem', color: t.brandPrimary }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>Trigger Pipeline</Typography>
          {project && <Chip label={project.name} size="small" sx={{ bgcolor: 'rgba(21,61,117,.14)', color: t.brandPrimary, fontWeight: 700, fontSize: '.7rem' }} />}
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: t.textSecondary }}><CloseIcon sx={{ fontSize: '1rem' }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {!project ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ color: t.textSecondary, fontSize: '.875rem' }}>Connect a project first to trigger a pipeline.</Typography>
          </Box>
        ) : (
          <Box>
            {/* Step 1: repo */}
            <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>1 — Select Repository</Typography>
            {loadingRepos ? (
              <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} sx={{ color: t.brandPrimary }} /></Box>
            ) : repos.length === 0 ? (
              <Box sx={{ p: 2, borderRadius: '8px', bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}`, mb: 2 }}>
                <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>No repositories in this project.</Typography>
              </Box>
            ) : (
              <Stack spacing={0.75} sx={{ mb: 2 }}>
                {repos.map((r) => (
                  <Box key={r.id} onClick={() => { setSelectedRepo(r); setPipeline(''); }}
                    sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${selectedRepo?.id === r.id ? t.brandPrimary : t.border}`,
                      bgcolor: selectedRepo?.id === r.id ? 'rgba(21,61,117,.1)' : t.surfaceSubtle,
                      cursor: 'pointer', '&:hover': { borderColor: t.brandPrimary } }}>
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <FolderOpenIcon sx={{ fontSize: '1rem', color: selectedRepo?.id === r.id ? t.brandPrimary : t.textSecondary }} />
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '.83rem', color: t.textPrimary }}>{r.repo_name}</Typography>
                        <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: 'monospace' }}>
                          {r.provider} · branch: {r.default_branch}
                        </Typography>
                      </Box>
                      {selectedRepo?.id === r.id && <CheckCircleIcon sx={{ fontSize: '.9rem', color: t.brandPrimary, ml: 'auto' }} />}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}

            {/* Step 2: pipeline file */}
            {selectedRepo && (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>2 — Select Pipeline File</Typography>
                <Stack spacing={0.75} sx={{ mb: 2 }}>
                  {detectedPipelines.length === 0 ? (
                    <Typography sx={{ color: t.textSecondary, fontSize: '.82rem', p: 1.5, bgcolor: t.surfaceSubtle, borderRadius: '8px', border: `1px solid ${t.border}` }}>
                      No pipeline files detected in this repository.
                    </Typography>
                  ) : detectedPipelines.map((pf) => (
                    <Box key={pf} onClick={() => setPipeline(pf)}
                      sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${pipeline === pf ? t.brandPrimary : t.border}`,
                        bgcolor: pipeline === pf ? 'rgba(21,61,117,.1)' : t.surfaceSubtle,
                        cursor: 'pointer', '&:hover': { borderColor: t.brandPrimary } }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <ArticleIcon sx={{ fontSize: '.9rem', color: pipeline === pf ? t.brandPrimary : t.textSecondary }} />
                        <Typography sx={{ fontSize: '.83rem', color: t.textPrimary, fontFamily: 'monospace' }}>{pf}</Typography>
                        {pipeline === pf && <CheckCircleIcon sx={{ fontSize: '.9rem', color: t.brandPrimary, ml: 'auto' }} />}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </>
            )}

            {/* Step 3: branch */}
            {pipeline && (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>3 — Branch</Typography>
                <TextField fullWidth size="small" value={branch} onChange={(e) => setBranch(e.target.value)}
                  placeholder="main" sx={{ mb: 2.5, '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontFamily: 'monospace' } }} />
              </>
            )}

            <Button fullWidth variant="contained" disabled={!pipeline || !branch.trim() || triggering}
              startIcon={triggering ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <PlayArrowIcon />}
              onClick={handleTrigger}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
              {triggering ? 'Triggering…' : 'Trigger Pipeline'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceDashboardPage
// ─────────────────────────────────────────────────────────────────────────────
const WorkspaceDashboardPage: React.FC = () => {
  const navigate                              = useNavigate();
  const { workspaceId }                       = useParams<{ workspaceId: string }>();
  const [ws, setWs]                           = useState<DevWorkspace | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [actionBusy, setActionBusy]           = useState(false);
  const [section, setSection]                 = useState<Section>('overview');
  const [leftOpen, setLeftOpen]               = useState(true);
  const [rightOpen, setRightOpen]             = useState(true);
  const [toast, setToast]                     = useState<string | null>(null);
  // Settings form
  const [settingsName, setSettingsName]       = useState('');
  const [settingsImage, setSettingsImage]     = useState('');
  const [settingsIde, setSettingsIde]         = useState('');
  const [settingsRegion, setSettingsRegion]   = useState('');
  const [settingsBusy, setSettingsBusy]       = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(false);
  // Env vars
  const [envVars, setEnvVars]                 = useState<{ key: string; value: string }[]>([]);
  const [newKey, setNewKey]                   = useState('');
  const [newVal, setNewVal]                   = useState('');
  // Poll interval
  const pollRef                               = useRef<ReturnType<typeof setInterval> | null>(null);
  // Group sidebar data (loaded when workspace has a connected group)
  const [groupSidebar, setGroupSidebar]       = useState<GroupSidebarData | null>(null);

  // ── Integration context — persisted to localStorage per workspace ─────────
  const lsKey = (k: string) => `ws_${workspaceId}_${k}`;
  const lsGet = <T,>(k: string): T | null => {
    try { const v = localStorage.getItem(lsKey(k)); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  };
  const lsSet = (k: string, v: unknown) => {
    try { if (v == null) localStorage.removeItem(lsKey(k)); else localStorage.setItem(lsKey(k), JSON.stringify(v)); } catch {}
  };

  const [connectedProject, setConnectedProject]   = useState<ConnectedProject | null>(() => lsGet<ConnectedProject>('project'));
  const [connectedEnv, setConnectedEnv]           = useState<ConnectedEnv | null>(() => lsGet<ConnectedEnv>('env'));
  const [activePipeline, setActivePipeline]       = useState<RunningPipeline | null>(() => lsGet<RunningPipeline>('pipeline'));
  // Modal open states
  const [projectModalOpen, setProjectModalOpen]   = useState(false);
  const [envModalOpen, setEnvModalOpen]           = useState(false);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [setupWizardOpen, setSetupWizardOpen]     = useState(false);

  // ── Kubernetes create form state ──────────────────────────────────────
  const [k8sView, setK8sView]                     = useState<'list' | 'create'>('list');
  const [k8sName, setK8sName]                     = useState('');
  const [_k8sProvider, _setK8sProvider]             = useState<'atonix' | 'aws' | 'gcp' | 'azure' | 'bare-metal'>('atonix');
  const [k8sRegion, setK8sRegion]                 = useState('us-east-1');
  const [k8sVersion, setK8sVersion]               = useState('1.29');
  const [k8sNodeCount, setK8sNodeCount]           = useState('3');
  const [_k8sNodeSize, _setK8sNodeSize]             = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  const [_k8sNamespace, setK8sNamespace]            = useState('');
  const [k8sBusy, setK8sBusy]                     = useState(false);
  const [k8sClusters, setK8sClusters]             = useState<{ name: string; provider: string; region: string; nodes: string; status: string; version: string; resource_id?: string }[]>([]);

  // ── Groups create form state ──────────────────────────────────────────
  const [groupsView, setGroupsView]               = useState<'list' | 'create'>('list');
  const [grpName, setGrpName]                     = useState('');
  const [grpDescription, setGrpDescription]       = useState('');
  const [grpVisibility, setGrpVisibility]         = useState<'private' | 'internal' | 'public'>('private');
  const [grpType, setGrpType]                     = useState<GroupType>('developer');
  const [_grpMembers, _setGrpMembers]               = useState('');
  const [grpBusy, setGrpBusy]                     = useState(false);
  const [groupsList, setGroupsList]               = useState<Group[]>([]);
  const [groupsLoaded, setGroupsLoaded]           = useState(false);

  // ── Environments create form state ────────────────────────────────────
  const [envsView, setEnvsView]                   = useState<'list' | 'create'>('list');
  const [envName, setEnvName]                     = useState('');
  const [envType, setEnvType]                     = useState<'dev' | 'stage' | 'prod'>('dev');
  const [envRegion, setEnvRegion]                 = useState('us-east-1');
  const [envAutoDeploy, setEnvAutoDeploy]         = useState(true);
  const [envApproval, setEnvApproval]             = useState(false);
  const [envBusy, setEnvBusy]                     = useState(false);
  const [envsList, setEnvsList]                   = useState<ApiEnvironment[]>([]);
  const [_envsLoaded, _setEnvsLoaded]               = useState(false);

  // ── Workspace repos state
  const [wsRepos, setWsRepos]                     = useState<BackendRepository[]>([]);
  const [wsReposLoading, setWsReposLoading]       = useState(false);
  const [wsReposLoaded, setWsReposLoaded]         = useState(false);
  const [wsRepoCreateOpen, setWsRepoCreateOpen]   = useState(false);
  const [wsRepoName, setWsRepoName]               = useState('');
  const [wsRepoDesc, setWsRepoDesc]               = useState('');
  const [wsRepoBranch, setWsRepoBranch]           = useState('main');
  const [wsRepoVis, setWsRepoVis]                 = useState<'private' | 'public'>('private');
  const [wsRepoBusy, setWsRepoBusy]               = useState(false);

  // ── Integration action handlers ────────────────────────────────────────────
  const handleConnectProject = (p: BackendProject) => {
    const proj: ConnectedProject = {
      id: String(p.id),
      name: p.name,
      project_key: p.project_key,
      repo_count: p.repo_count ?? 0,
      last_activity: p.last_activity ?? null,
      description: p.description ?? '',
    };
    setConnectedProject(proj);
    lsSet('project', proj);
    // Disconnect env when switching project
    setConnectedEnv(null);
    lsSet('env', null);
    setRightOpen(true);
    setToast(`Connected to project: ${p.name}`);
  };

  const handleConnectEnv = (env: ConnectedEnv) => {
    setConnectedEnv(env);
    lsSet('env', env);
    setRightOpen(true);
    setToast(`Environment "${env.name}" connected.`);
  };

  const handleTriggerPipeline = (pipeline: RunningPipeline) => {
    setActivePipeline(pipeline);
    lsSet('pipeline', pipeline);
    setRightOpen(true);
    setToast('Pipeline triggered! Redirecting to project…');
    setTimeout(() => {
      if (connectedProject) {
        navigate(`/developer/Dashboard/projects/${connectedProject.id}`);
      } else {
        navigate('/developer/Dashboard/cicd');
      }
    }, 1600);
  };

  const handleSetupCompleted = (updated: DevWorkspace, result: WorkspaceSetupWizardResult) => {
    setWs(updated);
    if (result.project) {
      setConnectedProject(result.project);
      lsSet('project', result.project);
    }
    if (result.environment) {
      setConnectedEnv(result.environment);
      lsSet('env', result.environment);
    }
    if (result.pipeline) {
      setActivePipeline(result.pipeline);
      lsSet('pipeline', result.pipeline);
    }
    setSection('overview');
    setRightOpen(true);
    setToast('Workspace setup completed.');
  };

  // ── slugify helper ─────────────────────────────────────────────────────
  const slugify = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);

  // ── create handlers ───────────────────────────────────────────────────
  const loadClusters = useCallback(async () => {
    try {
      const list = await listClusters();
      setK8sClusters(list.map(cl => ({
        name: cl.name,
        provider: (cl as any).metadata?.provider ?? 'atonix',
        region: cl.region,
        nodes: `${cl.node_count_actual ?? cl.node_count}/${cl.node_count}`,
        status: cl.status === 'running' ? 'healthy' : cl.status,
        version: `v${cl.kubernetes_version}`,
        resource_id: cl.resource_id,
      })));
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => { if (section === 'kubernetes') loadClusters(); }, [section, loadClusters]);

  const loadGroupsList = useCallback(async () => {
    try {
      const list = await listGroups();
      setGroupsList(list);
      setGroupsLoaded(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (section === 'groups' && !groupsLoaded) loadGroupsList();
  }, [section, groupsLoaded, loadGroupsList]);

  const loadWsRepos = useCallback(async () => {
    if (!workspaceId) return;
    setWsReposLoading(true);
    try {
      const list = await listReposByWorkspace(workspaceId);
      setWsRepos(list);
      setWsReposLoaded(true);
    } catch { /* ignore */ }
    finally { setWsReposLoading(false); }
  }, [workspaceId]);

  useEffect(() => {
    if (section === 'repositories' && !wsReposLoaded) loadWsRepos();
  }, [section, wsReposLoaded, loadWsRepos]);

  const handleCreateWsRepo = async () => {
    if (!wsRepoName.trim() || !workspaceId) return;
    setWsRepoBusy(true);
    try {
      const r = await createStandaloneRepo({
        repo_name: wsRepoName.trim(),
        repo_description: wsRepoDesc.trim() || undefined,
        visibility: wsRepoVis,
        default_branch: wsRepoBranch || 'main',
        workspace_id: workspaceId,
        workspace_name: ws?.display_name ?? '',
      });
      setWsRepos((prev) => [r, ...prev]);
      setWsRepoCreateOpen(false);
      setWsRepoName(''); setWsRepoDesc(''); setWsRepoBranch('main'); setWsRepoVis('private');
      setToast(`Repository "${r.repo_name}" created.`);
    } catch (e: any) {
      setToast(e?.response?.data?.detail ?? e?.message ?? 'Failed to create repository.');
    } finally { setWsRepoBusy(false); }
  };

  const handleCreateK8sCluster = async () => {
    if (!k8sName.trim()) { setToast('Cluster name is required.'); return; }
    setK8sBusy(true);
    try {
      await createCluster({
        name: k8sName.trim(),
        kubernetes_version: k8sVersion.startsWith('1.') ? k8sVersion + '.0' : k8sVersion,
        node_count: parseInt(k8sNodeCount, 10) || 3,
        region: k8sRegion,
        rbac_enabled: true,
        network_policy_enabled: true,
        auto_scaling_enabled: false,
        min_nodes: 1,
        max_nodes: 10,
        enabled_addons: ['metrics-server', 'ingress-nginx'],
      });
      setToast(`Cluster "${k8sName.trim()}" provisioning started.`);
      setK8sName(''); setK8sNamespace(''); setK8sView('list');
      loadClusters();
    } catch (e: any) {
      setToast(e?.response?.data?.detail ?? e?.message ?? 'Failed to create cluster.');
    }
    finally { setK8sBusy(false); }
  };

  const handleCreateGroup = async () => {
    if (!grpName.trim()) { setToast('Group name is required.'); return; }
    setGrpBusy(true);
    try {
      const g = await createGroup({
        name: grpName.trim(),
        handle: slugify(grpName),
        description: grpDescription.trim(),
        visibility: grpVisibility,
        group_type: grpType,
      });
      setGroupsList((prev) => [g, ...prev]);
      // Connect this workspace to the newly created group so it survives reload
      if (workspaceId) {
        try {
          const updated = await updateDevWorkspace(workspaceId, {
            connected_group_id: g.id,
            connected_group_name: g.name,
          });
          setWs(updated);
        } catch { /* non-fatal – group still created */ }
      }
      setToast(`Group "${g.name}" created. Opening dashboard…`);
      setGrpName(''); setGrpDescription('');
      // Navigate to the group's own dashboard
      navigate(`/groups/${g.id}`);
    } catch { setToast('Failed to create group.'); }
    finally { setGrpBusy(false); }
  };

  const handleCreateEnvironment = async () => {
    if (!envName.trim()) { setToast('Environment name is required.'); return; }
    if (!connectedProject) { setToast('Connect a project first before creating an environment.'); return; }
    setEnvBusy(true);
    try {
      const payload: CreateEnvironmentPayload = {
        name: envName.trim(),
        region: envRegion.trim() || 'us-east-1',
        description: `${envType.toUpperCase()} environment`,
        project: connectedProject.id,
        auto_deploy: envAutoDeploy,
        deployment_strategy: 'rolling',
        require_approval: envApproval,
        is_protected: envType === 'prod',
        notify_email: '',
      };
      const created = await createEnvironment(payload);
      setEnvsList((prev) => [created, ...prev]);
      setToast(`Environment "${created.name}" created.`);
      const asConnected: ConnectedEnv = {
        id: String(created.id), name: created.name, health: 'healthy',
        version: '—', lastDeploy: '—', errorRate: '—',
      };
      setConnectedEnv(asConnected); lsSet('env', asConnected);
      setEnvName(''); setEnvsView('list');
    } catch { setToast('Failed to create environment.'); }
    finally { setEnvBusy(false); }
  };

  const openPipelineModal = () => {
    if (!connectedProject) {
      setToast('Connect a project first before triggering a pipeline.');
      setSection('connect-project');
      return;
    }
    setPipelineModalOpen(true);
  };

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await getDevWorkspace(workspaceId);
      setWs(data);
      setSettingsName(data.display_name);
      setSettingsImage(data.image);
      setSettingsIde(data.ide);
      setSettingsRegion(data.region);
      // Auto-open right panel on error or high resource usage
      if (data.status === 'error' || data.cpu_percent > 80 || data.ram_percent > 80) {
        setRightOpen(true);
      }
      // Load group sidebar if workspace is connected to a group
      if (data.connected_group_id) {
        getWorkspaceGroupSidebar(workspaceId).then(d => setGroupSidebar(d)).catch(() => {});
      }
    } catch {
      setError('Could not load workspace.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
    // Poll every 8 s while the page is open (lightweight refresh for metrics/status)
    pollRef.current = setInterval(load, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  // ── Action helpers ─────────────────────────────────────────────────────────
  const doAction = async (fn: () => Promise<DevWorkspace>, msg: string) => {
    setActionBusy(true);
    try {
      const updated = await fn();
      setWs(updated);
      setToast(msg);
    } catch (e: any) {
      setToast(e?.response?.data?.detail ?? 'Action failed.');
    } finally { setActionBusy(false); }
  };

  const handleStart   = () => doAction(() => startDevWorkspace(workspaceId!),   'Workspace started.');
  const handleStop    = () => doAction(() => stopDevWorkspace(workspaceId!),    'Workspace stopped.');
  const handleRestart = () => doAction(() => restartDevWorkspace(workspaceId!), 'Workspace restarted.');
  const handleSaveSettings = async () => {
    if (!workspaceId) return;
    setSettingsBusy(true);
    try {
      const updated = await updateDevWorkspace(workspaceId, {
        display_name: settingsName, image: settingsImage, ide: settingsIde, region: settingsRegion,
      });
      setWs(updated);
      setToast('Settings saved.');
    } catch { setToast('Failed to save settings.'); }
    finally { setSettingsBusy(false); }
  };
  const handleDeleteWorkspace = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await deleteDevWorkspace(workspaceId!);
      navigate('/developer/Dashboard/workspace');
    } catch { setToast('Stop the workspace before deleting it.'); setConfirmDelete(false); }
  };

  // ── Derived UI values ──────────────────────────────────────────────────────
  const cfg       = STATUS_CFG[ws?.status ?? 'stopped'] ?? STATUS_CFG.stopped;
  const isRunning  = ws?.status === 'running';
  const canStart   = (ws?.status === 'stopped' || ws?.status === 'error');
  const canStop    = (ws?.status === 'running' || ws?.status === 'starting');
  const canRestart = isRunning;

  // ── Group permission gate ─────────────────────────────────────────────────
  const { can } = useGroupPermissions(ws?.connected_group_id ?? undefined);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: t.background }}>
        <CircularProgress sx={{ color: t.brandPrimary }} />
      </Box>
    );
  }
  if (error || !ws) {
    return (
      <Box sx={{ p: 4, bgcolor: t.background, minHeight: '100vh' }}>
        <Alert severity="error">{error ?? 'Workspace not found.'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/developer/Dashboard/workspace')}>← Back to workspaces</Button>
      </Box>
    );
  }

  // ── Section panels ─────────────────────────────────────────────────────────
  const renderCenter = () => {
    switch (section) {
      // ── Overview ────────────────────────────────────────────────────────
      case 'overview': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          {/* Stat row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 3 }}>
            {[
              { label: 'Status',     value: cfg.label,          color: cfg.color,                         icon: <CheckCircleIcon sx={{ fontSize: '1.25rem' }} /> },
              { label: 'CPU Usage',  value: `${ws.cpu_percent}%`, color: ws.cpu_percent > 80 ? dashboardSemanticColors.danger : t.textPrimary, icon: <MemoryIcon sx={{ fontSize: '1.25rem' }} /> },
              { label: 'RAM Usage',  value: `${ws.ram_percent}%`, color: ws.ram_percent > 80 ? dashboardSemanticColors.danger : t.textPrimary, icon: <StorageIcon sx={{ fontSize: '1.25rem' }} /> },
              { label: 'Containers', value: ws.containers.toString(), color: t.textPrimary,               icon: <HubIcon sx={{ fontSize: '1.25rem' }} /> },
            ].map((s) => (
              <Box key={s.label} sx={{ p: 2, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: s.color, mt: 0.25 }}>{s.value}</Typography>
                  </Box>
                  <Box sx={{ color: t.textTertiary }}>{s.icon}</Box>
                </Stack>
              </Box>
            ))}
          </Box>

          {/* Resource bars */}
          <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 2 }}>Resource Usage</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
              <MetricBar label="CPU" value={ws.cpu_percent} />
              <MetricBar label="Memory" value={ws.ram_percent} />
              <MetricBar label="Disk (est.)" value={34} />
              <MetricBar label="Network I/O" value={12} />
            </Box>
          </Box>

          {/* Workspace info */}
          <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>Workspace Info</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
              {[
                { label: 'Workspace ID',  value: ws.workspace_id },
                { label: 'Image',         value: ws.image },
                { label: 'IDE',           value: ws.ide },
                { label: 'Region',        value: ws.region },
                { label: 'Started At',    value: ws.started_at ? new Date(ws.started_at).toLocaleString() : '—' },
                { label: 'Created At',    value: new Date(ws.created_at).toLocaleString() },
              ].map((r) => (
                <Box key={r.label}>
                  <Typography sx={{ fontSize: '.68rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>{r.label}</Typography>
                  <Typography sx={{ fontSize: '.82rem', color: t.textPrimary, fontFamily: 'monospace', fontWeight: 500, wordBreak: 'break-all' }}>{r.value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Recent activity */}
          <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}` }}>
            <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>Recent Activity</Typography>
            <Stack spacing={1}>
              {[
                { time: '2 min ago',  msg: 'Workspace started', type: 'success' },
                { time: '3 min ago',  msg: 'Persistent volume attached at /workspace', type: 'info' },
                { time: '5 min ago',  msg: 'Secrets injected from vault', type: 'info' },
                { time: '12 min ago', msg: 'VS Code server launched on :8443', type: 'success' },
                { time: '1 hr ago',   msg: 'Workspace stopped by user', type: 'info' },
              ].map((a, i) => (
                <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: a.type === 'success' ? dashboardSemanticColors.success : t.textTertiary, mt: '6px', flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontSize: '.82rem', color: t.textPrimary }}>{a.msg}</Typography>
                    <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>{a.time}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      );

      // ── IDE ──────────────────────────────────────────────────────────────
      case 'ide': return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {isRunning && ws.editor_url ? (
            <>
              <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <CodeIcon sx={{ fontSize: '.9rem', color: t.brandPrimary }} />
                <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>VS Code — {ws.display_name}</Typography>
                <Button size="small" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem' }} />}
                  component="a" href={ws.editor_url} target="_blank"
                  sx={{ ml: 'auto', textTransform: 'none', color: t.brandPrimary, fontWeight: 700, fontSize: '.78rem' }}>
                  Open in new tab
                </Button>
              </Box>
              <Box sx={{ flex: 1, bgcolor: '#1e1e2e' }}>
                <iframe
                  src={ws.editor_url}
                  title="VS Code IDE"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '18px', bgcolor: 'rgba(21,61,117,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CodeIcon sx={{ fontSize: '2rem', color: t.brandPrimary }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: t.textPrimary }}>IDE not available</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.875rem', textAlign: 'center', maxWidth: 360 }}>
                Start the workspace to launch the browser-based VS Code IDE.
              </Typography>
              {canStart && can('project.edit') && (
                <Button variant="contained" startIcon={actionBusy ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <PlayArrowIcon />}
                  onClick={handleStart} disabled={actionBusy}
                  sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                  Start Workspace
                </Button>
              )}
            </Box>
          )}
        </Box>
      );

      // ── Terminal ─────────────────────────────────────────────────────────
      case 'terminal': return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <InteractiveTerminal
            workspaceId={ws.workspace_id}
            image={ws.image}
            ide={ws.ide}
            region={ws.region}
            isRunning={isRunning}
            onStart={handleStart}
            actionBusy={actionBusy}
          />
        </Box>
      );

      // ── Pipelines ────────────────────────────────────────────────────────
      case 'pipelines': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>CI/CD Pipelines</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Trigger and monitor pipeline runs for this workspace.</Typography>
            </Box>
            <Button variant="outlined" size="small" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem' }} />}
              onClick={() => navigate('/developer/Dashboard/cicd')}
              sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, borderRadius: '8px', fontWeight: 600 }}>
              View All Pipelines
            </Button>
          </Stack>

          {[
            { name: 'build-test',      branch: 'main',    status: 'passed',  ago: '4 min ago',  duration: '1m 23s' },
            { name: 'deploy-staging',  branch: 'develop', status: 'running', ago: '1 min ago',  duration: '—' },
            { name: 'lint-check',      branch: 'main',    status: 'failed',  ago: '22 min ago', duration: '44s' },
          ].map((p) => (
            <Box key={p.name} sx={{ p: 2, borderRadius: '10px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 1.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor:
                    p.status === 'passed'  ? dashboardSemanticColors.success :
                    p.status === 'running' ? dashboardSemanticColors.warning :
                    dashboardSemanticColors.danger, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary, fontFamily: 'monospace' }}>{p.name}</Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip label={p.branch} size="small" sx={{ height: 16, fontSize: '.6rem', bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, '& .MuiChip-label': { px: 0.6 } }} />
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>{p.ago}</Typography>
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>· {p.duration}</Typography>
                    </Stack>
                  </Box>
                </Stack>
                <Chip size="small" label={p.status}
                  sx={{ fontWeight: 700, fontSize: '.72rem',
                    bgcolor: p.status === 'passed'  ? 'rgba(34,197,94,.12)'  :
                             p.status === 'running' ? 'rgba(251,191,36,.12)' :
                             'rgba(239,68,68,.12)',
                    color:   p.status === 'passed'  ? dashboardSemanticColors.success :
                             p.status === 'running' ? dashboardSemanticColors.warning :
                             dashboardSemanticColors.danger }} />
              </Stack>
            </Box>
          ))}
        </Box>
      );

      // ── Deployments ──────────────────────────────────────────────────────
      case 'deployments': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Deployment Environments</Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.82rem', mb: 2.5 }}>Active deployments across your environments.</Typography>

          {[
            { env: 'Production',  version: 'v1.4.2', health: 'Healthy', uptime: '99.97%', lastDeploy: '2 days ago', errorRate: '0.01%', color: dashboardSemanticColors.success },
            { env: 'Staging',     version: 'v1.5.0-rc1', health: 'Healthy', uptime: '99.80%', lastDeploy: '1 hr ago', errorRate: '0.12%', color: dashboardSemanticColors.success },
            { env: 'Development', version: 'v1.5.1-dev', health: 'Degraded', uptime: '97.20%', lastDeploy: '5 min ago', errorRate: '1.4%', color: dashboardSemanticColors.warning },
          ].map((env) => (
            <Box key={env.env} sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: env.color }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary }}>{env.env}</Typography>
                  <Chip label={env.version} size="small" sx={{ height: 18, fontSize: '.65rem', fontFamily: 'monospace', bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, '& .MuiChip-label': { px: 0.75 } }} />
                </Stack>
                <Chip label={env.health} size="small" sx={{ fontWeight: 700, fontSize: '.72rem',
                  bgcolor: env.color === dashboardSemanticColors.success ? 'rgba(34,197,94,.12)' : 'rgba(251,191,36,.12)',
                  color: env.color }} />
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                {[
                  { l: 'Uptime',       v: env.uptime },
                  { l: 'Last Deploy',  v: env.lastDeploy },
                  { l: 'Error Rate',   v: env.errorRate },
                ].map((s) => (
                  <Box key={s.l}>
                    <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.l}</Typography>
                    <Typography sx={{ fontSize: '.82rem', color: t.textPrimary, fontWeight: 600 }}>{s.v}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      );

      // ── Metrics ──────────────────────────────────────────────────────────
      case 'metrics': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>Live Metrics</Typography>
            <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: '.9rem' }} />} onClick={load}
              sx={{ textTransform: 'none', color: t.textSecondary, fontWeight: 600 }}>Refresh</Button>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
            {[
              { label: 'CPU Usage',      value: ws.cpu_percent, unit: '%', icon: <MemoryIcon />,  sub: `${ws.containers} process${ws.containers !== 1 ? 'es' : ''}` },
              { label: 'Memory Usage',   value: ws.ram_percent, unit: '%', icon: <StorageIcon />, sub: 'of allocated 4 GB' },
              { label: 'Disk I/O',       value: 34,             unit: '%', icon: <StorageIcon />, sub: '1.2 GB of 3.5 GB used' },
              { label: 'Network I/O',    value: 12,             unit: '%', icon: <HubIcon />,     sub: 'Inbound: 4 MB/s' },
            ].map((m) => (
              <Box key={m.label} sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.8rem', color:
                      m.value > 80 ? dashboardSemanticColors.danger : m.value > 60 ? dashboardSemanticColors.warning : t.textPrimary }}>
                      {m.value}<Typography component="span" sx={{ fontSize: '1rem', fontWeight: 500, color: t.textSecondary }}>{m.unit}</Typography>
                    </Typography>
                  </Box>
                  <Box sx={{ color: t.textTertiary }}>{m.icon}</Box>
                </Stack>
                <MetricBar label="" value={m.value} />
                <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, mt: 0.75 }}>{m.sub}</Typography>
              </Box>
            ))}
          </Box>

          {/* Uptime & health */}
          <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}` }}>
            <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>Health Checks</Typography>
            <Stack spacing={1}>
              {[
                { name: 'Liveness Probe',   status: isRunning ? 'Pass' : 'Fail',    ok: isRunning },
                { name: 'Readiness Probe',  status: isRunning ? 'Pass' : 'Pending', ok: isRunning },
                { name: 'Startup Probe',    status: isRunning ? 'Pass' : 'Fail',    ok: isRunning },
              ].map((h) => (
                <Stack key={h.name} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: '.83rem', color: t.textPrimary }}>{h.name}</Typography>
                  <Chip size="small" label={h.status}
                    sx={{ fontWeight: 700, fontSize: '.7rem',
                      bgcolor: h.ok ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                      color: h.ok ? dashboardSemanticColors.success : dashboardSemanticColors.danger }} />
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      );

      // ── Logs ─────────────────────────────────────────────────────────────
      case 'logs': return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <ArticleIcon sx={{ fontSize: '.9rem', color: t.textSecondary }} />
            <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>Workspace Logs</Typography>
            <Chip label="LIVE" size="small" sx={{ height: 17, fontSize: '.6rem', fontWeight: 800, bgcolor: isRunning ? 'rgba(34,197,94,.14)' : t.surfaceSubtle, color: isRunning ? dashboardSemanticColors.success : t.textTertiary, '& .MuiChip-label': { px: 0.75 } }} />
            <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: '.8rem' }} />} onClick={load}
              sx={{ ml: 'auto', textTransform: 'none', color: t.textSecondary, fontSize: '.75rem' }}>Refresh</Button>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#1a1c2e', p: 1.5, fontFamily: 'monospace', fontSize: '.78rem' }}>
            {Array.from({ length: 20 }, (_, i) => {
              const level = LOG_LEVELS[i % LOG_LEVELS.length];
              const msg   = LOG_MSGS[i % LOG_MSGS.length];
              const time  = new Date(Date.now() - i * 47000).toISOString().replace('T', ' ').slice(0, 19);
              const lc    = level === 'ERROR' ? '#f38ba8' : level === 'WARN' ? '#fab387' : level === 'DEBUG' ? '#89b4fa' : '#a6e3a1';
              return (
                <Stack key={i} direction="row" spacing={1.5} sx={{ py: 0.3 }}>
                  <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit', color: '#6c7086', minWidth: 152, flexShrink: 0 }}>{time}</Typography>
                  <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit', color: lc, minWidth: 45, flexShrink: 0, fontWeight: 700 }}>{level}</Typography>
                  <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit', color: '#cdd6f4' }}>{msg}</Typography>
                </Stack>
              );
            })}
          </Box>
        </Box>
      );

      // ── Secrets ──────────────────────────────────────────────────────────
      case 'secrets': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Secrets</Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem', mb: 2.5 }}>
            Secrets are injected at workspace start from the OrcaCloud Secrets Vault.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2.5 }}>
            {[
              { label: 'Injected Secrets',   value: '5', icon: <LockIcon />,   color: dashboardSemanticColors.success },
              { label: 'Expiring in 7 days', value: '1', icon: <WarningAmberIcon />, color: dashboardSemanticColors.warning },
            ].map((c) => (
              <Box key={c.label} sx={{ p: 2, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}` }}>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.label}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: c.color }}>{c.value}</Typography>
                  </Box>
                  <Box sx={{ color: c.color, opacity: .7 }}>{c.icon}</Box>
                </Stack>
              </Box>
            ))}
          </Box>
          <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>Mounted Secrets</Typography>
            <Stack spacing={1}>
              {['DATABASE_URL','API_SECRET_KEY','STRIPE_SECRET','AWS_ACCESS_TOKEN','GITHUB_TOKEN'].map((k) => (
                <Stack key={k} direction="row" alignItems="center" spacing={1.5}>
                  <LockIcon sx={{ fontSize: '.875rem', color: t.textTertiary }} />
                  <Typography sx={{ fontSize: '.82rem', color: t.textPrimary, fontFamily: 'monospace', flex: 1 }}>{k}</Typography>
                  <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>••••••••</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
          <Button variant="outlined" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem' }} />}
            onClick={() => navigate('/dashboard/secrets')}
            sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, borderRadius: '8px', fontWeight: 600 }}>
            Manage Secrets Vault
          </Button>
        </Box>
      );

      // ── Environment Variables ─────────────────────────────────────────────
      case 'env-vars': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Environment Variables</Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem', mb: 2.5 }}>
            Variables are set in the workspace container at startup.
          </Typography>
          {/* Add row */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField size="small" placeholder="KEY" value={newKey} onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              sx={{ flex: 1, '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontFamily: 'monospace' } }} />
            <TextField size="small" placeholder="value" value={newVal} onChange={(e) => setNewVal(e.target.value)}
              sx={{ flex: 2, '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontFamily: 'monospace' } }} />
            <Button variant="contained" size="small" startIcon={<AddIcon />}
              onClick={() => { if (newKey.trim()) { setEnvVars((v) => [...v, { key: newKey.trim(), value: newVal }]); setNewKey(''); setNewVal(''); } }}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px', flexShrink: 0 }}>
              Add
            </Button>
          </Stack>
          <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${t.border}` }}>
            <Box sx={{ bgcolor: t.surfaceSubtle, px: 2, py: 1, display: 'grid', gridTemplateColumns: '1fr 2fr auto' }}>
              {['Key', 'Value', ''].map((h, i) => (
                <Typography key={i} sx={{ fontSize: '.72rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</Typography>
              ))}
            </Box>
            {[
              { key: 'NODE_ENV',       value: 'development' },
              { key: 'PORT',           value: '3000' },
              { key: 'LOG_LEVEL',      value: 'debug' },
              ...envVars,
            ].map((v, i) => (
              <Box key={v.key + i} sx={{ px: 2, py: 1.25, display: 'grid', gridTemplateColumns: '1fr 2fr auto', alignItems: 'center', borderTop: `1px solid ${t.border}`, bgcolor: t.surface, '&:hover': { bgcolor: t.surfaceHover } }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '.8rem', color: t.brandPrimary, fontWeight: 600 }}>{v.key}</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '.8rem', color: t.textPrimary }}>{v.value}</Typography>
                <IconButton size="small" onClick={() => setEnvVars((ev) => ev.filter((_, idx) => idx !== i - 3))}
                  sx={{ color: dashboardSemanticColors.danger, opacity: i >= 3 ? 1 : 0.3 }} disabled={i < 3}>
                  <CloseIcon sx={{ fontSize: '.9rem' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      );

      // ── Settings ─────────────────────────────────────────────────────────
      case 'settings': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 2.5 }}>Workspace Settings</Typography>
          <Box sx={{ maxWidth: 560 }}>
            <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, mb: 0.5 }}>Display Name</Typography>
            <TextField fullWidth size="small" value={settingsName} onChange={(e) => setSettingsName(e.target.value)}
              sx={{ mb: 2, '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }} />

            <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, mb: 0.5 }}>Base Image</Typography>
            <TextField fullWidth size="small" value={settingsImage} onChange={(e) => setSettingsImage(e.target.value)}
              sx={{ mb: 2, '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontFamily: 'monospace' } }} />

            <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, mb: 0.5 }}>IDE</Typography>
            <TextField fullWidth size="small" value={settingsIde} onChange={(e) => setSettingsIde(e.target.value)}
              sx={{ mb: 2, '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary } }} />

            <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: t.textSecondary, mb: 0.5 }}>Region</Typography>
            <TextField fullWidth size="small" value={settingsRegion} onChange={(e) => setSettingsRegion(e.target.value)}
              sx={{ mb: 3, '& .MuiInputBase-root': { bgcolor: t.surfaceSubtle, color: t.textPrimary, fontFamily: 'monospace' } }} />

            <Button variant="contained" startIcon={settingsBusy ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveIcon sx={{ fontSize: '1rem' }} />}
              onClick={handleSaveSettings} disabled={settingsBusy || !can('group.manage_settings')}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px', mb: 5 }}>
              Save Changes
            </Button>

            <Box sx={{ p: 2.5, border: `1px solid ${dashboardSemanticColors.danger}30`, borderRadius: '12px', bgcolor: `${dashboardSemanticColors.danger}08` }}>
              <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: dashboardSemanticColors.danger, mb: 0.5 }}>Danger Zone</Typography>
              <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, mb: 1.5, lineHeight: 1.55 }}>
                Delete this workspace and all its data. Stop the workspace first before deleting.
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="outlined" size="small" startIcon={<DeleteOutlineIcon sx={{ fontSize: '.9rem' }} />}
                  onClick={handleDeleteWorkspace} disabled={!can('group.manage_settings')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: dashboardSemanticColors.danger, color: dashboardSemanticColors.danger, '&:hover': { bgcolor: `${dashboardSemanticColors.danger}12` } }}>
                  {confirmDelete ? 'Confirm Delete?' : 'Delete Workspace'}
                </Button>
                {confirmDelete && (
                  <Button size="small" onClick={() => setConfirmDelete(false)}
                    sx={{ textTransform: 'none', color: t.textSecondary }}>Cancel</Button>
                )}
              </Stack>
            </Box>
          </Box>
        </Box>
      );

      // ── Sessions ─────────────────────────────────────────────────────────
      case 'sessions': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Active Sessions</Typography>
          <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2.5 }}>Live coding and terminal sessions for this workspace.</Typography>
          <Stack spacing={1.25}>
            {[
              { user: 'you@orcacloud.com', type: 'VS Code', since: '42 min ago', active: true },
              { user: 'teammate@orcacloud.com', type: 'Terminal', since: '7 min ago', active: true },
              { user: 'bot/CI-runner', type: 'API', since: '1 hr ago', active: false },
            ].map((s, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: '10px', border: `1px solid ${t.border}`, bgcolor: t.surface }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.active ? dashboardSemanticColors.success : t.textTertiary, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '.83rem', color: t.textPrimary }}>{s.user}</Typography>
                    <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>{s.type} · connected {s.since}</Typography>
                  </Box>
                </Stack>
                <Chip label={s.active ? 'active' : 'idle'} size="small"
                  sx={{ fontWeight: 700, fontSize: '.7rem', bgcolor: s.active ? 'rgba(34,197,94,.12)' : t.surfaceSubtle, color: s.active ? dashboardSemanticColors.success : t.textTertiary }} />
              </Box>
            ))}
          </Stack>
        </Box>
      );

      // ── Tools ─────────────────────────────────────────────────────────────
      case 'tools': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Developer Tools</Typography>
          <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2.5 }}>Runtime tools available in this workspace.</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 1.5 }}>
            {[
              { name: 'Git',      version: '2.42.0',  icon: '', status: 'ok' },
              { name: 'Node.js',  version: '20.11.1', icon: '[node]', status: 'ok' },
              { name: 'npm',      version: '10.2.4',  icon: '[npm]', status: 'ok' },
              { name: 'Python 3', version: '3.11.7',  icon: '', status: 'ok' },
              { name: 'Docker',   version: '25.0.3',  icon: '', status: 'ok' },
              { name: 'kubectl',  version: '1.29.1',  icon: '[k8s]',  status: 'ok' },
              { name: 'Terraform',version: '1.7.3',   icon: '[tf]', status: 'ok' },
              { name: 'Go',       version: '1.22.0',  icon: '', status: 'ok' },
            ].map((tool) => (
              <Box key={tool.name} sx={{ p: 2, borderRadius: '10px', border: `1px solid ${t.border}`, bgcolor: t.surface, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '1.4rem' }}>{tool.icon}</Typography>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '.83rem', color: t.textPrimary }}>{tool.name}</Typography>
                  <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: 'monospace' }}>{tool.version}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      );

      // ── Connect Project ───────────────────────────────────────────────────
      case 'connect-project': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Connected Project</Typography>
          <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2.5 }}>Attach a project to this workspace for context-aware features.</Typography>
          {!connectedProject ? (
            <Box sx={{ p: 4, borderRadius: '14px', border: `2px dashed ${t.border}`, textAlign: 'center' }}>
              <AccountTreeIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.75 }}>No project connected</Typography>
              <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>Connect a project to enable pipeline triggers, environment linking, and more.</Typography>
              <Button variant="contained" startIcon={<AccountTreeIcon />} onClick={() => setProjectModalOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                Browse Projects
              </Button>
            </Box>
          ) : (
            <Box>
              <Box sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${t.brandPrimary}30`, bgcolor: 'rgba(21,61,117,.05)', mb: 2 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: t.brandPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{connectedProject.name[0]?.toUpperCase()}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '.95rem', color: t.textPrimary }}>{connectedProject.name}</Typography>
                      <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: 'monospace' }}>{connectedProject.project_key}</Typography>
                    </Box>
                  </Stack>
                  <Chip icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dashboardSemanticColors.success, ml: '6px !important' }} />}
                    label="connected" size="small"
                    sx={{ fontWeight: 700, fontSize: '.7rem', bgcolor: 'rgba(34,197,94,.12)', color: dashboardSemanticColors.success }} />
                </Stack>
                {connectedProject.description && (
                  <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, mb: 1.5, lineHeight: 1.55 }}>{connectedProject.description}</Typography>
                )}
                <Stack direction="row" spacing={2}>
                  <Box>
                    <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.08em' }}>Repos</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary }}>{connectedProject.repo_count}</Typography>
                  </Box>
                  {connectedProject.last_activity && (
                    <Box>
                      <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.08em' }}>Last Activity</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary }}>{connectedProject.last_activity}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                <Button size="small" variant="outlined" startIcon={<OpenInNewIcon sx={{ fontSize: '.85rem' }} />}
                  onClick={() => navigate(`/developer/Dashboard/projects/${connectedProject.id}`)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
                  View Project
                </Button>
                <Button size="small" variant="outlined" startIcon={<AccountTreeIcon sx={{ fontSize: '.85rem' }} />}
                  onClick={() => setProjectModalOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
                  Switch
                </Button>
                <Button size="small" variant="outlined"
                  onClick={() => { setConnectedProject(null); lsSet('project', null); setConnectedEnv(null); lsSet('env', null); setActivePipeline(null); lsSet('pipeline', null); }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: `${dashboardSemanticColors.danger}50`, color: dashboardSemanticColors.danger, '&:hover': { bgcolor: `${dashboardSemanticColors.danger}10` } }}>
                  Disconnect
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      );

      // ── Connect Environment ───────────────────────────────────────────────
      case 'connect-env': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Connected Environment</Typography>
          <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2.5 }}>Link a deployment environment to this workspace.</Typography>
          {!connectedEnv ? (
            <Box sx={{ p: 4, borderRadius: '14px', border: `2px dashed ${t.border}`, textAlign: 'center' }}>
              <LayersIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.75 }}>No environment linked</Typography>
              <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>
                {!connectedProject ? 'Connect a project first, then select an environment.' : 'Select an environment to track deployments and health from this workspace.'}
              </Typography>
              <Button variant="contained" startIcon={<LayersIcon />} onClick={() => setEnvModalOpen(true)} disabled={!connectedProject}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                Select Environment
              </Button>
            </Box>
          ) : (() => {
            const healthColor = connectedEnv.health === 'healthy' ? dashboardSemanticColors.success
                              : connectedEnv.health === 'degraded' ? dashboardSemanticColors.warning
                              : dashboardSemanticColors.danger;
            return (
              <Box>
                <Box sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${healthColor}30`, bgcolor: `${healthColor}08`, mb: 2 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: healthColor, flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '.95rem', color: t.textPrimary }}>{connectedEnv.name}</Typography>
                        <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: 'monospace' }}>{connectedEnv.version}</Typography>
                      </Box>
                    </Stack>
                    <Chip label={connectedEnv.health} size="small"
                      sx={{ fontWeight: 700, fontSize: '.7rem', bgcolor: `${healthColor}18`, color: healthColor }} />
                  </Stack>
                  <Stack direction="row" spacing={2.5}>
                    <Box>
                      <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.08em' }}>Last Deploy</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>{connectedEnv.lastDeploy}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.08em' }}>Error Rate</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary }}>{connectedEnv.errorRate}</Typography>
                    </Box>
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  <Button size="small" variant="contained"
                    startIcon={<DashboardIcon sx={{ fontSize: '.85rem' }} />}
                    onClick={() => navigate(`/developer/Dashboard/environment/${connectedEnv.id}`)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover } }}>
                    Open Dashboard
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => setEnvModalOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
                    Switch
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<ViewTimelineIcon sx={{ fontSize: '.85rem' }} />}
                    onClick={() => setSection('pipelines')}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
                    Pipelines
                  </Button>
                  <Button size="small" variant="outlined"
                    onClick={() => { setConnectedEnv(null); lsSet('env', null); }}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: `${dashboardSemanticColors.danger}50`, color: dashboardSemanticColors.danger, '&:hover': { bgcolor: `${dashboardSemanticColors.danger}10` } }}>
                    Disconnect
                  </Button>
                </Stack>
              </Box>
            );
          })()}
        </Box>
      );

      // ── Trigger Pipeline ──────────────────────────────────────────────────
      case 'trigger-pipeline': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary, mb: 0.5 }}>Trigger Pipeline</Typography>
          <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2.5 }}>Start a CI/CD pipeline run from this workspace.</Typography>

          {/* Active pipeline run */}
          {activePipeline && (
            <Box sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${dashboardSemanticColors.info}30`, bgcolor: `${dashboardSemanticColors.info}08`, mb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em' }}>Active Run</Typography>
                <Button size="small" onClick={() => { setActivePipeline(null); lsSet('pipeline', null); }}
                  sx={{ textTransform: 'none', fontSize: '.72rem', color: t.textTertiary, minWidth: 0, px: 1, '&:hover': { color: dashboardSemanticColors.danger } }}>Dismiss</Button>
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, fontFamily: 'monospace' }}>{activePipeline.name}</Typography>
                  <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                    Branch: {activePipeline.branch} · started {new Date(activePipeline.startedAt).toLocaleTimeString()}
                  </Typography>
                </Box>
                <Chip label={activePipeline.status} size="small"
                  sx={{ fontWeight: 700, fontSize: '.7rem',
                    bgcolor: activePipeline.status === 'running' ? `${dashboardSemanticColors.info}18`
                           : activePipeline.status === 'passed' ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                    color: activePipeline.status === 'running' ? dashboardSemanticColors.info
                         : activePipeline.status === 'passed' ? dashboardSemanticColors.success : dashboardSemanticColors.danger }} />
              </Stack>
            </Box>
          )}

          {!connectedProject ? (
            <Box sx={{ p: 4, borderRadius: '14px', border: `2px dashed ${t.border}`, textAlign: 'center' }}>
              <ViewTimelineIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.75 }}>No project connected</Typography>
              <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>Connect a project to this workspace to trigger CI/CD pipeline runs.</Typography>
              <Button variant="contained" startIcon={<AccountTreeIcon />} onClick={() => setProjectModalOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                Connect Project First
              </Button>
            </Box>
          ) : (
            <Box sx={{ p: 4, borderRadius: '14px', border: `1px solid ${t.border}`, textAlign: 'center', bgcolor: t.surface }}>
              <ViewTimelineIcon sx={{ fontSize: '2.5rem', color: t.brandPrimary, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.5 }}>Ready to run</Typography>
              <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>
                Trigger a pipeline on <strong style={{ color: t.textPrimary }}>{connectedProject.name}</strong>. Choose a repo and pipeline file to get started.
              </Typography>
              <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => setPipelineModalOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                Trigger Pipeline
              </Button>
            </Box>
          )}
        </Box>
      );

      // ── Projects ──────────────────────────────────────────────────────────
      case 'projects': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>Projects</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Projects connected to this workspace.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem' }} />}
                onClick={() => navigate('/developer/Dashboard/projects')}
                sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, borderRadius: '8px', fontWeight: 600 }}>
                All Projects
              </Button>
              <Button variant="contained" size="small" startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
                onClick={() => setSetupWizardOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
                Add Project
              </Button>
            </Stack>
          </Stack>

          {/* Connected project card */}
          {connectedProject ? (
            <Box sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${t.brandPrimary}30`, bgcolor: 'rgba(21,61,117,.05)', mb: 2 }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: t.brandPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{connectedProject.name[0]?.toUpperCase()}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '.95rem', color: t.textPrimary }}>{connectedProject.name}</Typography>
                    <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: 'monospace' }}>{connectedProject.project_key}</Typography>
                  </Box>
                </Stack>
                <Chip icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dashboardSemanticColors.success, ml: '6px !important' }} />}
                  label="active" size="small"
                  sx={{ fontWeight: 700, fontSize: '.7rem', bgcolor: 'rgba(34,197,94,.12)', color: dashboardSemanticColors.success }} />
              </Stack>
              {connectedProject.description && (
                <Typography sx={{ fontSize: '.8rem', color: t.textSecondary, mb: 1.5, lineHeight: 1.55 }}>{connectedProject.description}</Typography>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em' }}>Repositories</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary }}>{connectedProject.repo_count}</Typography>
                </Box>
                {connectedProject.last_activity && (
                  <Box>
                    <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em' }}>Last Activity</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary }}>{connectedProject.last_activity}</Typography>
                  </Box>
                )}
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" startIcon={<OpenInNewIcon sx={{ fontSize: '.85rem' }} />}
                  onClick={() => navigate(`/developer/Dashboard/projects/${connectedProject.id}`)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary }}>
                  Open Project
                </Button>
                <Button size="small" variant="outlined" startIcon={<PlayCircleOutlineIcon sx={{ fontSize: '.85rem' }} />}
                  onClick={() => setSection('pipelines')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary }}>
                  Pipelines
                </Button>
                <Button size="small" variant="outlined" startIcon={<RocketLaunchIcon sx={{ fontSize: '.85rem' }} />}
                  onClick={() => setSection('deployments')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary }}>
                  Deployments
                </Button>
                <Button size="small" variant="outlined" startIcon={<BarChartIcon sx={{ fontSize: '.85rem' }} />}
                  onClick={() => setSection('metrics')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary }}>
                  Metrics
                </Button>
                <Button size="small" variant="outlined" startIcon={<ArticleIcon sx={{ fontSize: '.85rem' }} />}
                  onClick={() => setSection('logs')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary }}>
                  Logs
                </Button>
                <Button size="small" variant="outlined"
                  onClick={() => { setProjectModalOpen(true); }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: t.border, color: t.textSecondary }}>
                  Switch
                </Button>
                <Button size="small" variant="outlined"
                  onClick={() => { setConnectedProject(null); lsSet('project', null); setConnectedEnv(null); lsSet('env', null); setActivePipeline(null); lsSet('pipeline', null); }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: `${dashboardSemanticColors.danger}50`, color: dashboardSemanticColors.danger }}>
                  Disconnect
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ p: 4, borderRadius: '14px', border: `2px dashed ${t.border}`, textAlign: 'center', mb: 2 }}>
              <FolderOpenIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.75 }}>No project connected</Typography>
              <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>
                Connect a project to enable pipelines, deployments, logs, and metrics from this workspace.
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center">
                <Button variant="contained" startIcon={<AccountTreeIcon />} onClick={() => setProjectModalOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                  Browse Projects
                </Button>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setSetupWizardOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: t.border, color: t.textSecondary }}>
                  Create New
                </Button>
              </Stack>
            </Box>
          )}

          {/* Project quick-nav shortcuts */}
          <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}` }}>
            <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.5 }}>Quick Navigation</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {[
                { label: 'Code & Repository', icon: <CodeIcon sx={{ fontSize: '1rem' }} />, section: 'ide' as Section },
                { label: 'CI/CD Pipelines',   icon: <PlayCircleOutlineIcon sx={{ fontSize: '1rem' }} />, section: 'pipelines' as Section },
                { label: 'Deployments',        icon: <RocketLaunchIcon sx={{ fontSize: '1rem' }} />, section: 'deployments' as Section },
                { label: 'Logs',               icon: <ArticleIcon sx={{ fontSize: '1rem' }} />, section: 'logs' as Section },
                { label: 'Metrics',            icon: <BarChartIcon sx={{ fontSize: '1rem' }} />, section: 'metrics' as Section },
                { label: 'Containers',         icon: <AppsIcon sx={{ fontSize: '1rem' }} />, section: 'containers' as Section },
              ].map((item) => (
                <Box key={item.label}
                  onClick={() => setSection(item.section)}
                  sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${t.border}`, bgcolor: t.surfaceSubtle, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 1, '&:hover': { borderColor: t.brandPrimary, bgcolor: 'rgba(21,61,117,.06)' } }}>
                  <Box sx={{ color: t.textTertiary }}>{item.icon}</Box>
                  <Typography sx={{ fontSize: '.78rem', color: t.textPrimary, fontWeight: 600 }}>{item.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      );

      // ── Repositories ───────────────────────────────────────────────────────
      case 'repositories': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>Repositories</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Code repositories in this workspace.</Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
              onClick={() => setWsRepoCreateOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
              New Repo
            </Button>
          </Stack>

          {wsReposLoading ? (
            <CircularProgress size={28} sx={{ display: 'block', mx: 'auto', mt: 4 }} />
          ) : wsRepos.length === 0 ? (
            <Box sx={{ p: 4, borderRadius: '14px', border: `2px dashed ${t.border}`, textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.5 }}>No repositories yet</Typography>
              <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>Create a repository to store your workspace code.</Typography>
              <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setWsRepoCreateOpen(true)}
                sx={{ textTransform: 'none', borderRadius: '8px', borderColor: t.border, color: t.textSecondary }}>Create Repository</Button>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {wsRepos.map((r) => (
                <Box key={r.id}
                  onClick={() => navigate(`/developer/Dashboard/repo/${r.id}`)}
                  sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${t.border}`, bgcolor: t.surface, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    '&:hover': { borderColor: t.brandPrimary, bgcolor: 'rgba(21,61,117,.04)' } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <StorageIcon sx={{ fontSize: '1.3rem', color: t.brandPrimary }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary }}>{r.repo_name}</Typography>
                      {r.repo_description && <Typography sx={{ fontSize: '.75rem', color: t.textSecondary }}>{r.repo_description}</Typography>}
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={r.visibility ?? 'private'} size="small" sx={{ fontSize: '.68rem', height: 20 }} />
                    <Chip label={r.default_branch} size="small" sx={{ fontSize: '.68rem', height: 20, fontFamily: 'monospace' }} />
                    <OpenInNewIcon sx={{ fontSize: '1rem', color: t.textTertiary }} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          {/* Create repo dialog */}
          <Dialog open={wsRepoCreateOpen} onClose={() => setWsRepoCreateOpen(false)} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: '16px', bgcolor: t.surface } }}>
            <DialogTitle sx={{ fontWeight: 800, fontFamily: FONT }}>New Repository</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="Repository name" value={wsRepoName} onChange={(e) => setWsRepoName(e.target.value)}
                  fullWidth size="small" required />
                <TextField label="Description (optional)" value={wsRepoDesc} onChange={(e) => setWsRepoDesc(e.target.value)}
                  fullWidth size="small" multiline rows={2} />
                <TextField label="Default branch" value={wsRepoBranch} onChange={(e) => setWsRepoBranch(e.target.value)}
                  fullWidth size="small" placeholder="main" />
                <FormControl fullWidth size="small">
                  <InputLabel>Visibility</InputLabel>
                  <Select label="Visibility" value={wsRepoVis} onChange={(e) => setWsRepoVis(e.target.value as 'private' | 'public')}>
                    <MenuItem value="private">Private</MenuItem>
                    <MenuItem value="public">Public</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setWsRepoCreateOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
              <Button onClick={handleCreateWsRepo} variant="contained" disabled={!wsRepoName.trim() || wsRepoBusy}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
                {wsRepoBusy ? <CircularProgress size={16} color="inherit" /> : 'Create'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );

      // ── Containers ────────────────────────────────────────────────────────
      case 'containers': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>Containers</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Runtime containers attached to this workspace.</Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
              onClick={() => setSetupWizardOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
              Add Container
            </Button>
          </Stack>

          {[
            { name: 'api-server',   type: 'API',    status: 'running', cpu: 22, ram: 38, size: 'M',  uptime: '3h 12m' },
            { name: 'worker-1',     type: 'Worker', status: 'running', cpu: 8,  ram: 14, size: 'S',  uptime: '3h 12m' },
            { name: 'cron-cleanup', type: 'Cron',   status: 'stopped', cpu: 0,  ram: 0,  size: 'S',  uptime: '—' },
          ].map((c) => (
            <Box key={c.name} sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <AppsIcon sx={{ fontSize: '1.1rem', color: c.status === 'running' ? dashboardSemanticColors.success : t.textTertiary }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '.88rem', color: t.textPrimary, fontFamily: 'monospace' }}>{c.name}</Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip label={c.type} size="small" sx={{ height: 16, fontSize: '.6rem', bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, '& .MuiChip-label': { px: 0.6 } }} />
                      <Chip label={`Size: ${c.size}`} size="small" sx={{ height: 16, fontSize: '.6rem', bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, '& .MuiChip-label': { px: 0.6 } }} />
                      <Typography sx={{ fontSize: '.7rem', color: t.textTertiary }}>Uptime: {c.uptime}</Typography>
                    </Stack>
                  </Box>
                </Stack>
                <Chip label={c.status} size="small"
                  sx={{ fontWeight: 700, fontSize: '.72rem',
                    bgcolor: c.status === 'running' ? 'rgba(34,197,94,.12)' : t.surfaceSubtle,
                    color:   c.status === 'running' ? dashboardSemanticColors.success : t.textTertiary }} />
              </Stack>
              {c.status === 'running' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <MetricBar label="CPU" value={c.cpu} />
                  <MetricBar label="RAM" value={c.ram} />
                </Box>
              )}
              <Stack direction="row" spacing={1} mt={1.5}>
                <Button size="small" variant="outlined" startIcon={<ArticleIcon sx={{ fontSize: '.8rem' }} />}
                  onClick={() => setSection('logs')}
                  sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: t.border, color: t.textSecondary, borderRadius: '7px' }}>Logs</Button>
                <Button size="small" variant="outlined" startIcon={<BarChartIcon sx={{ fontSize: '.8rem' }} />}
                  onClick={() => setSection('metrics')}
                  sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: t.border, color: t.textSecondary, borderRadius: '7px' }}>Metrics</Button>
                {c.status === 'running'
                  ? <Button size="small" variant="outlined" startIcon={<StopIcon sx={{ fontSize: '.8rem' }} />}
                      sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: `${dashboardSemanticColors.danger}50`, color: dashboardSemanticColors.danger, borderRadius: '7px' }}>Stop</Button>
                  : <Button size="small" variant="outlined" startIcon={<PlayArrowIcon sx={{ fontSize: '.8rem' }} />}
                      sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: `${dashboardSemanticColors.success}50`, color: dashboardSemanticColors.success, borderRadius: '7px' }}>Start</Button>
                }
              </Stack>
            </Box>
          ))}
        </Box>
      );

      // ── Kubernetes ─────────────────────────────────────────────────────────
      case 'kubernetes': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          {k8sView === 'list' ? (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>Kubernetes</Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Provision and manage Kubernetes clusters for this workspace.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem' }} />}
                    onClick={() => navigate('/developer/Dashboard/kubernetes')}
                    sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, borderRadius: '8px', fontWeight: 600 }}>
                    Full Dashboard
                  </Button>
                  <Button size="small" variant="contained"
                    startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
                    onClick={() => setK8sView('create')}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
                    Create Cluster
                  </Button>
                </Stack>
              </Stack>

              {/* Cluster list from API */}
              {k8sClusters.length === 0 ? (
                <Box sx={{ p: 4, borderRadius: '14px', border: `2px dashed ${t.border}`, textAlign: 'center', mb: 2 }}>
                  <CloudIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.75 }}>No clusters yet</Typography>
                  <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>Create a Kubernetes cluster to run your workloads.</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setK8sView('create')}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                    Create Your First Cluster
                  </Button>
                </Box>
              ) : (
                <Box sx={{ mb: 2 }}>
                  {k8sClusters.map((cl) => (
                    <Box key={cl.name} sx={{ p: 2, borderRadius: '10px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 1.25 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary, fontFamily: 'monospace' }}>{cl.name}</Typography>
                          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                            {cl.region} · {cl.version} · {cl.nodes} nodes
                          </Typography>
                        </Box>
                        <Chip label={cl.status} size="small"
                          sx={{ fontWeight: 700, fontSize: '.7rem',
                            bgcolor: cl.status === 'healthy' || cl.status === 'running' ? 'rgba(34,197,94,.12)' : cl.status === 'provisioning' ? 'rgba(59,130,246,.12)' : 'rgba(251,191,36,.12)',
                            color: cl.status === 'healthy' || cl.status === 'running' ? dashboardSemanticColors.success : cl.status === 'provisioning' ? dashboardSemanticColors.info : dashboardSemanticColors.warning,
                          }} />
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Namespace overview */}
              <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}` }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>Common Namespaces</Typography>
                <Stack spacing={0.75}>
                  {['default', 'orcacloud-prod', 'orcacloud-staging', 'monitoring', 'ingress-nginx'].map((ns) => (
                    <Stack key={ns} direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dashboardSemanticColors.info, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '.82rem', color: t.textPrimary, fontFamily: 'monospace' }}>{ns}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </>
          ) : (
            /* ── Create Cluster Form ── */
            <>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                <IconButton size="small" onClick={() => setK8sView('list')} sx={{ color: t.textSecondary }}>
                  <ArrowBackIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>New Kubernetes Cluster</Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Provision a managed Kubernetes cluster on OrcaCloud.</Typography>
                </Box>
              </Stack>

              <Stack spacing={2}>
                <TextField
                  label="Cluster Name *" size="small" fullWidth
                  value={k8sName}
                  onChange={e => setK8sName(e.target.value)}
                  placeholder="e.g. prod-cluster-1"
                  InputLabelProps={{ sx: { color: t.textSecondary } }}
                  inputProps={{ sx: { color: t.textPrimary } }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle } }}
                />
                <Stack direction="row" spacing={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: t.textSecondary }}>Region</InputLabel>
                    <Select label="Region" value={k8sRegion} onChange={e => setK8sRegion(e.target.value)}
                      sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
                      {CLUSTER_REGIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: t.textSecondary }}>Version</InputLabel>
                    <Select label="Version" value={k8sVersion} onChange={e => setK8sVersion(e.target.value)}
                      sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
                      {K8S_VERSIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>
                <TextField
                  label="Node Count" size="small" fullWidth type="number"
                  value={k8sNodeCount}
                  onChange={e => setK8sNodeCount(e.target.value)}
                  inputProps={{ min: 1, max: 100, sx: { color: t.textPrimary } }}
                  InputLabelProps={{ sx: { color: t.textSecondary } }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle } }}
                />

                <Stack direction="row" spacing={1} justifyContent="flex-end" pt={1}>
                  <Button size="small" variant="outlined" onClick={() => setK8sView('list')} disabled={k8sBusy}
                    sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, borderRadius: '8px' }}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" onClick={handleCreateK8sCluster} disabled={k8sBusy || !can('kubernetes.deploy')}
                    startIcon={k8sBusy ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <CloudIcon sx={{ fontSize: '.9rem' }} />}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
                    {k8sBusy ? 'Creating…' : 'Create Cluster'}
                  </Button>
                </Stack>
              </Stack>
            </>
          )}
        </Box>
      );

      // ── Groups ─────────────────────────────────────────────────────────────
      case 'groups': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          {groupsView === 'create' ? (
            /* ── Create Group Form ── */
            <>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                <IconButton size="small" onClick={() => setGroupsView('list')} sx={{ color: t.textSecondary }}>
                  <ArrowBackIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>New Group</Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Create a group to organise members, projects and pipelines.</Typography>
                </Box>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  label="Group name *" size="small" fullWidth
                  value={grpName}
                  onChange={e => setGrpName(e.target.value)}
                  placeholder="e.g. backend-team"
                  InputLabelProps={{ sx: { color: t.textSecondary } }}
                  inputProps={{ sx: { color: t.textPrimary } }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle } }}
                />
                <TextField
                  label="Description" size="small" fullWidth multiline rows={2}
                  value={grpDescription}
                  onChange={e => setGrpDescription(e.target.value)}
                  InputLabelProps={{ sx: { color: t.textSecondary } }}
                  inputProps={{ sx: { color: t.textPrimary } }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle } }}
                />
                <Stack direction="row" spacing={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: t.textSecondary }}>Group Type</InputLabel>
                    <Select label="Group Type" value={grpType}
                      onChange={e => setGrpType(e.target.value as GroupType)}
                      sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
                      {(['developer', 'production', 'marketing', 'data', 'custom'] as GroupType[]).map(t2 => (
                        <MenuItem key={t2} value={t2} sx={{ textTransform: 'capitalize' }}>{t2}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: t.textSecondary }}>Visibility</InputLabel>
                    <Select label="Visibility" value={grpVisibility}
                      onChange={e => setGrpVisibility(e.target.value as GroupVisibility)}
                      sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
                      <MenuItem value="private">Private</MenuItem>
                      <MenuItem value="internal">Internal</MenuItem>
                      <MenuItem value="public">Public</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                <Stack direction="row" spacing={1} justifyContent="flex-end" pt={1}>
                  <Button size="small" variant="outlined" onClick={() => setGroupsView('list')} disabled={grpBusy}
                    sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, borderRadius: '8px' }}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" onClick={handleCreateGroup} disabled={grpBusy}
                    startIcon={grpBusy ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <GroupsIcon sx={{ fontSize: '.9rem' }} />}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
                    {grpBusy ? 'Creating…' : 'Create Group'}
                  </Button>
                </Stack>
              </Stack>
            </>
          ) : (
            /* ── Group List ── */
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>Groups</Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Teams and groups connected to this workspace.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" size="small"
                    onClick={() => setSetupWizardOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderColor: t.border, color: t.textSecondary, borderRadius: '8px' }}>
                    Connect Group
                  </Button>
                  <Button variant="contained" size="small" startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
                    onClick={() => setGroupsView('create')}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
                    Create Group
                  </Button>
                </Stack>
              </Stack>

              {/* Created / loaded groups list */}
              {groupsList.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  {groupsList.map((g) => (
                    <Box key={g.id}
                      onClick={() => navigate(`/groups/${g.id}`)}
                      sx={{ p: 2, borderRadius: '10px', bgcolor: t.surface, border: `1px solid ${ws.connected_group_id === g.id ? t.brandPrimary : t.border}`, mb: 1, cursor: 'pointer',
                        '&:hover': { borderColor: t.brandPrimary, bgcolor: 'rgba(21,61,117,.05)' } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: t.brandPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '.78rem', color: '#fff' }}>{g.name[0]?.toUpperCase()}</Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary }}>{g.name}</Typography>
                            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: 'monospace' }}>@{g.handle} · {g.group_type}</Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {ws.connected_group_id === g.id && (
                            <Chip label="connected" size="small"
                              sx={{ fontWeight: 700, fontSize: '.7rem', bgcolor: 'rgba(34,197,94,.12)', color: dashboardSemanticColors.success }} />
                          )}
                          <Chip label={g.visibility} size="small"
                            sx={{ fontWeight: 700, fontSize: '.7rem',
                              bgcolor: g.visibility === 'public' ? 'rgba(34,197,94,.12)' : g.visibility === 'internal' ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.12)',
                              color: g.visibility === 'public' ? dashboardSemanticColors.success : g.visibility === 'internal' ? dashboardSemanticColors.warning : dashboardSemanticColors.danger,
                            }} />
                          <OpenInNewIcon sx={{ fontSize: '.85rem', color: t.textTertiary }} />
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}

              {ws.connected_group_name ? (
                <Box sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${t.brandPrimary}30`, bgcolor: 'rgba(21,61,117,.05)', mb: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: t.brandPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GroupsIcon sx={{ fontSize: '1.1rem', color: '#fff' }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary }}>{ws.connected_group_name}</Typography>
                        <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, fontFamily: 'monospace' }}>ID: {ws.connected_group_id}</Typography>
                      </Box>
                    </Stack>
                    <Chip label="connected" size="small" sx={{ fontWeight: 700, fontSize: '.7rem', bgcolor: 'rgba(34,197,94,.12)', color: dashboardSemanticColors.success }} />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" endIcon={<OpenInNewIcon sx={{ fontSize: '.8rem' }} />}
                      onClick={() => navigate(`/groups/${ws.connected_group_id}`)}
                      sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: t.border, color: t.textSecondary, borderRadius: '7px' }}>View Group</Button>
                    <Button size="small" variant="outlined" onClick={() => setSetupWizardOpen(true)}
                      sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: t.border, color: t.textSecondary, borderRadius: '7px' }}>Change</Button>
                  </Stack>
                </Box>
              ) : (
                groupsList.length === 0 && (
                  <Box sx={{ p: 4, borderRadius: '14px', border: `2px dashed ${t.border}`, textAlign: 'center', mb: 2 }}>
                    <GroupsIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.75 }}>No group yet</Typography>
                    <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>Create a new group or connect an existing one.</Typography>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button variant="outlined" onClick={() => setSetupWizardOpen(true)}
                        sx={{ textTransform: 'none', fontWeight: 600, borderColor: t.border, color: t.textSecondary, borderRadius: '10px' }}>
                        Connect Group
                      </Button>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setGroupsView('create')}
                        sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                        Create Group
                      </Button>
                    </Stack>
                  </Box>
                )
              )}

              {/* Members preview */}
              <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: t.surface, border: `1px solid ${t.border}` }}>
                <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1.25 }}>Team Members</Typography>
                <Stack spacing={0.75}>
                  {[
                    { name: 'you@orcacloud.com', role: 'Owner' },
                    { name: 'teammate@orcacloud.com', role: 'Developer' },
                    { name: 'reviewer@orcacloud.com', role: 'Viewer' },
                  ].map((m) => (
                    <Stack key={m.name} direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar sx={{ width: 26, height: 26, fontSize: '.7rem', bgcolor: t.brandPrimary }}>{m.name[0].toUpperCase()}</Avatar>
                        <Typography sx={{ fontSize: '.82rem', color: t.textPrimary }}>{m.name}</Typography>
                      </Stack>
                      <Chip label={m.role} size="small" sx={{ height: 18, fontSize: '.65rem', fontWeight: 700, bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}` }} />
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Box>
      );

      // ── Environments ───────────────────────────────────────────────────────
      case 'environments': return (
        <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
          {envsView === 'create' ? (
            /* ── Create Environment Form ── */
            <>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                <IconButton size="small" onClick={() => setEnvsView('list')} sx={{ color: t.textSecondary }}>
                  <ArrowBackIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>New Environment</Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>
                    Create a deployment environment{!connectedProject && ' — connect a project first for full wiring'}.
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  label="Environment name *" size="small" fullWidth
                  value={envName}
                  onChange={e => setEnvName(e.target.value)}
                  placeholder="e.g. production, staging, dev-alice"
                  InputLabelProps={{ sx: { color: t.textSecondary } }}
                  inputProps={{ sx: { color: t.textPrimary } }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.surfaceSubtle } }}
                />
                <Stack direction="row" spacing={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: t.textSecondary }}>Stage</InputLabel>
                    <Select label="Stage" value={envType} onChange={e => setEnvType(e.target.value as 'dev' | 'stage' | 'prod')}
                      sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
                      <MenuItem value="dev">Development</MenuItem>
                      <MenuItem value="stage">Staging</MenuItem>
                      <MenuItem value="prod">Production</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: t.textSecondary }}>Region</InputLabel>
                    <Select label="Region" value={envRegion} onChange={e => setEnvRegion(e.target.value)}
                      sx={{ bgcolor: t.surfaceSubtle, color: t.textPrimary }}>
                      {['us-east-1','us-west-2','eu-west-1','eu-central-1','ap-southeast-1','ap-northeast-1'].map(r =>
                        <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>
                <Stack direction="row" spacing={3}>
                  <FormControlLabel
                    control={<Switch checked={envAutoDeploy} onChange={e => setEnvAutoDeploy(e.target.checked)} size="small" />}
                    label={<Typography variant="body2" sx={{ color: t.textPrimary }}>Auto-deploy</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={envApproval} onChange={e => setEnvApproval(e.target.checked)} size="small" />}
                    label={<Typography variant="body2" sx={{ color: t.textPrimary }}>Require approval</Typography>}
                  />
                </Stack>
                {!connectedProject && (
                  <Alert severity="warning" sx={{ fontSize: '.8rem' }}>
                    No project connected. The new environment will be created but not linked to a project.
                    <Button size="small" sx={{ ml: 1 }} onClick={() => { setEnvsView('list'); setSection('connect-project'); }}>
                      Connect project
                    </Button>
                  </Alert>
                )}
                <Stack direction="row" spacing={1} justifyContent="flex-end" pt={1}>
                  <Button size="small" variant="outlined" onClick={() => setEnvsView('list')} disabled={envBusy}
                    sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, borderRadius: '8px' }}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" onClick={handleCreateEnvironment} disabled={envBusy || !can('environment.create')}
                    startIcon={envBusy ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <DnsIcon sx={{ fontSize: '.9rem' }} />}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
                    {envBusy ? 'Creating…' : 'Create Environment'}
                  </Button>
                </Stack>
              </Stack>
            </>
          ) : (
            /* ── Environment List ── */
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: t.textPrimary }}>Environments</Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>Deployment environments linked to this workspace.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" size="small"
                    onClick={() => setEnvModalOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderColor: t.border, color: t.textSecondary, borderRadius: '8px' }}>
                    Connect
                  </Button>
                  <Button variant="contained" size="small" startIcon={<AddIcon sx={{ fontSize: '.9rem' }} />}
                    onClick={() => setEnvsView('create')}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '8px' }}>
                    Create Environment
                  </Button>
                </Stack>
              </Stack>

              {/* Connected env summary */}
              {connectedEnv && (
                <Box sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${dashboardSemanticColors.success}30`, bgcolor: `${dashboardSemanticColors.success}08`, mb: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dashboardSemanticColors.success, flexShrink: 0 }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary }}>{connectedEnv.name}</Typography>
                    </Stack>
                    <Chip label="active" size="small" sx={{ fontWeight: 700, fontSize: '.7rem', bgcolor: 'rgba(34,197,94,.12)', color: dashboardSemanticColors.success }} />
                  </Stack>
                  <Stack direction="row" spacing={2.5}>
                    <Box>
                      <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em' }}>Health</Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: '.82rem', color: t.textPrimary }}>{connectedEnv.health}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em' }}>Last Deploy</Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: '.82rem', color: t.textPrimary }}>{connectedEnv.lastDeploy}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '.05em' }}>Error Rate</Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: '.82rem', color: t.textPrimary }}>{connectedEnv.errorRate}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} mt={1.5}>
                    <Button size="small" variant="outlined"
                      onClick={() => navigate(`/developer/Dashboard/environment/${connectedEnv.id}`)}
                      sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: t.border, color: t.textSecondary, borderRadius: '7px' }}>Open Dashboard</Button>
                    <Button size="small" variant="outlined" startIcon={<RocketLaunchIcon sx={{ fontSize: '.8rem' }} />}
                      onClick={() => setSection('deployments')}
                      sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: t.border, color: t.textSecondary, borderRadius: '7px' }}>Deployments</Button>
                    <Button size="small" variant="outlined"
                      onClick={() => { setConnectedEnv(null); lsSet('env', null); }}
                      sx={{ textTransform: 'none', fontSize: '.75rem', borderColor: `${dashboardSemanticColors.danger}50`, color: dashboardSemanticColors.danger, borderRadius: '7px' }}>Disconnect</Button>
                  </Stack>
                </Box>
              )}

              {/* Environments created in this session */}
              {envsList.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  {envsList.map((env) => (
                    <Box key={env.id} sx={{ p: 2, borderRadius: '10px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary }}>{env.name}</Typography>
                          <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
                            {env.region} · {env.deployment_strategy}
                          </Typography>
                        </Box>
                        <Chip label={env.is_protected ? 'Protected' : 'Open'} size="small"
                          sx={{ fontWeight: 700, fontSize: '.7rem',
                            bgcolor: env.is_protected ? 'rgba(239,68,68,.1)' : 'rgba(34,197,94,.12)',
                            color: env.is_protected ? dashboardSemanticColors.danger : dashboardSemanticColors.success }} />
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Default environment overview */}
              {connectedEnv == null && envsList.length === 0 && (
                <Box sx={{ p: 4, borderRadius: '14px', border: `2px dashed ${t.border}`, textAlign: 'center', mb: 2 }}>
                  <DnsIcon sx={{ fontSize: '2.5rem', color: t.textTertiary, mb: 1 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, mb: 0.75 }}>No environments yet</Typography>
                  <Typography sx={{ fontSize: '.82rem', color: t.textSecondary, mb: 2 }}>Create a deployment environment to deploy your workloads.</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEnvsView('create')}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: t.brandPrimary, '&:hover': { bgcolor: t.brandPrimaryHover }, borderRadius: '10px' }}>
                    Create Your First Environment
                  </Button>
                </Box>
              )}

              {[
                { name: 'Production',  type: 'prod',  health: 'healthy',  lastDeploy: '2 days ago', errorRate: '0.01%', color: dashboardSemanticColors.success },
                { name: 'Staging',     type: 'stage', health: 'healthy',  lastDeploy: '1 hr ago',   errorRate: '0.12%', color: dashboardSemanticColors.success },
                { name: 'Development', type: 'dev',   health: 'degraded', lastDeploy: '5 min ago',  errorRate: '1.4%',  color: dashboardSemanticColors.warning },
              ].map((env) => (
                <Box key={env.name} sx={{ p: 2, borderRadius: '10px', bgcolor: t.surface, border: `1px solid ${t.border}`, mb: 1.25 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: env.color, flexShrink: 0 }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '.85rem', color: t.textPrimary }}>{env.name}</Typography>
                      <Chip label={env.type} size="small" sx={{ height: 16, fontSize: '.6rem', bgcolor: t.surfaceSubtle, color: t.textSecondary, border: `1px solid ${t.border}`, '& .MuiChip-label': { px: 0.6 } }} />
                    </Stack>
                    <Chip label={env.health} size="small"
                      sx={{ fontWeight: 700, fontSize: '.7rem',
                        bgcolor: env.health === 'healthy' ? 'rgba(34,197,94,.12)' : 'rgba(251,191,36,.12)',
                        color: env.color }} />
                  </Stack>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>Last deploy: {env.lastDeploy}</Typography>
                    <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>Errors: {env.errorRate}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} mt={1}>
                    <Button size="small" variant="outlined"
                      sx={{ textTransform: 'none', fontSize: '.73rem', borderColor: t.border, color: t.textSecondary, borderRadius: '6px' }}
                      onClick={() => { setEnvModalOpen(true); }}>Connect</Button>
                    <Button size="small" variant="outlined" startIcon={<RocketLaunchIcon sx={{ fontSize: '.8rem' }} />}
                      onClick={() => setSection('deployments')}
                      sx={{ textTransform: 'none', fontSize: '.73rem', borderColor: t.border, color: t.textSecondary, borderRadius: '6px' }}>Deploy</Button>
                    <Button size="small" variant="outlined" startIcon={<ArticleIcon sx={{ fontSize: '.8rem' }} />}
                      onClick={() => setSection('logs')}
                      sx={{ textTransform: 'none', fontSize: '.73rem', borderColor: t.border, color: t.textSecondary, borderRadius: '6px' }}>Logs</Button>
                  </Stack>
                </Box>
              ))}
            </>
          )}
        </Box>
      );

      // ── Workspace Setup ────────────────────────────────────────────────────
      case 'workspace-setup': {
        setSetupWizardOpen(true);
        setSection('overview');
        return null;
      }

      default: return null;
    }
  };

  // ── Right panel content ────────────────────────────────────────────────────
  const events = [
    ...(ws.status === 'error' ? [{ type: 'error', msg: 'Workspace entered error state', time: 'just now' }] : []),
    ...(ws.cpu_percent > 80 ? [{ type: 'warn', msg: `CPU at ${ws.cpu_percent}% — consider scaling`, time: 'just now' }] : []),
    ...(ws.ram_percent > 80 ? [{ type: 'warn', msg: `Memory at ${ws.ram_percent}% — approaching limit`, time: 'just now' }] : []),
    { type: 'info',    msg: 'VS Code server: healthy', time: '1 min ago' },
    { type: 'info',    msg: 'Health check: passed', time: '3 min ago' },
    { type: 'success', msg: 'Workspace started', time: isRunning && ws.started_at ? new Date(ws.started_at).toLocaleTimeString() : '—' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: t.background, fontFamily: FONT, overflow: 'hidden' }}>

      {/* ════════════════ ACTION-RICH HEADER ════════════════════════════════ */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface, flexShrink: 0, flexWrap: 'wrap', minHeight: 54 }}>
        {/* Back */}
        <Tooltip title="Back to Workspaces">
          <IconButton size="small" onClick={() => navigate('/developer/Dashboard/workspace')}
            sx={{ color: t.textSecondary, '&:hover': { color: t.textPrimary } }}>
            <ArrowBackIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ borderColor: t.border, height: 20, alignSelf: 'center' }} />

        {/* Identity */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: t.brandPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TerminalIcon sx={{ fontSize: '.85rem', color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '.9rem', color: t.textPrimary, lineHeight: 1.1 }}>{ws.display_name}</Typography>
            <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, fontFamily: 'monospace' }}>{ws.workspace_id}</Typography>
          </Box>
          {/* Status dot + chip */}
          <Chip
            icon={<Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.dot, display: 'inline-block', ml: '6px !important' }} />}
            label={cfg.label} size="small"
            sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '.72rem', height: 22, '& .MuiChip-label': { pl: 0.5 } }} />
        </Stack>

        {/* Start / Stop / Restart */}
        <Stack direction="row" spacing={0.75} sx={{ ml: 1 }}>
          {canStart && can('project.edit') && (
            <Button size="small" variant="contained" startIcon={actionBusy ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <PlayArrowIcon sx={{ fontSize: '.9rem' }} />}
              onClick={handleStart} disabled={actionBusy}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: dashboardSemanticColors.success, '&:hover': { bgcolor: '#16a34a' }, borderRadius: '8px', fontSize: '.75rem', py: 0.4 }}>
              Start
            </Button>
          )}
          {canStop && can('project.edit') && (
            <Button size="small" variant="outlined" startIcon={actionBusy ? <CircularProgress size={12} /> : <StopIcon sx={{ fontSize: '.9rem' }} />}
              onClick={handleStop} disabled={actionBusy}
              sx={{ textTransform: 'none', fontWeight: 700, borderColor: dashboardSemanticColors.warning, color: dashboardSemanticColors.warning, borderRadius: '8px', fontSize: '.75rem', py: 0.4, '&:hover': { bgcolor: 'rgba(251,191,36,.1)' } }}>
              Stop
            </Button>
          )}
          {canRestart && can('project.edit') && (
            <Button size="small" variant="outlined" startIcon={actionBusy ? <CircularProgress size={12} /> : <RefreshIcon sx={{ fontSize: '.9rem' }} />}
              onClick={handleRestart} disabled={actionBusy}
              sx={{ textTransform: 'none', fontWeight: 700, borderColor: t.border, color: t.textSecondary, borderRadius: '8px', fontSize: '.75rem', py: 0.4, '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary } }}>
              Restart
            </Button>
          )}
        </Stack>

        {/* Metric bars */}
        {isRunning && (
          <Stack direction="row" spacing={2} sx={{ mx: 1 }}>
            <MetricBar label="CPU"  value={ws.cpu_percent} maxWidth={100} />
            <MetricBar label="RAM"  value={ws.ram_percent} maxWidth={100} />
          </Stack>
        )}

        {/* Process count */}
        {isRunning && (
          <Box sx={{ px: 1.25, py: 0.4, borderRadius: '8px', bgcolor: t.surfaceSubtle, border: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: '.72rem', color: t.textSecondary, fontWeight: 600 }}>
              {ws.containers} process{ws.containers !== 1 ? 'es' : ''}
            </Typography>
          </Box>
        )}

        {/* Quick actions spacer */}
        <Box sx={{ flex: 1 }} />

        <Button
          size="small"
          variant="outlined"
          startIcon={<TuneIcon sx={{ fontSize: '.85rem' }} />}
          onClick={() => setSetupWizardOpen(true)}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '8px',
            borderColor: t.border,
            color: t.textSecondary,
            fontSize: '.73rem',
            '&:hover': { borderColor: t.brandPrimary, color: t.brandPrimary },
          }}
        >
          Setup
        </Button>

        {/* Quick actions */}
        {isRunning && (
          <Stack direction="row" spacing={0.75}>
            <Tooltip title="Open IDE">
              <Button size="small" startIcon={<CodeIcon sx={{ fontSize: '.85rem' }} />}
                component="a" href={ws.editor_url} target="_blank"
                sx={{ textTransform: 'none', color: t.textSecondary, fontWeight: 600, fontSize: '.73rem', borderRadius: '8px', '&:hover': { color: t.brandPrimary, bgcolor: 'rgba(21,61,117,.07)' } }}>
                IDE
              </Button>
            </Tooltip>
            <Tooltip title="Open Terminal">
              <Button size="small" startIcon={<TerminalIcon sx={{ fontSize: '.85rem' }} />}
                onClick={() => setSection('terminal')}
                sx={{ textTransform: 'none', color: t.textSecondary, fontWeight: 600, fontSize: '.73rem', borderRadius: '8px', '&:hover': { color: t.brandPrimary, bgcolor: 'rgba(21,61,117,.07)' } }}>
                Terminal
              </Button>
            </Tooltip>
            <Tooltip title="View Logs">
              <Button size="small" startIcon={<ArticleIcon sx={{ fontSize: '.85rem' }} />}
                onClick={() => setSection('logs')}
                sx={{ textTransform: 'none', color: t.textSecondary, fontWeight: 600, fontSize: '.73rem', borderRadius: '8px', '&:hover': { color: t.brandPrimary, bgcolor: 'rgba(21,61,117,.07)' } }}>
                Logs
              </Button>
            </Tooltip>
            <Tooltip title="View Metrics">
              <Button size="small" startIcon={<BarChartIcon sx={{ fontSize: '.85rem' }} />}
                onClick={() => setSection('metrics')}
                sx={{ textTransform: 'none', color: t.textSecondary, fontWeight: 600, fontSize: '.73rem', borderRadius: '8px', '&:hover': { color: t.brandPrimary, bgcolor: 'rgba(21,61,117,.07)' } }}>
                Metrics
              </Button>
            </Tooltip>
          </Stack>
        )}

        {/* Right panel toggle */}
        <Tooltip title={rightOpen ? 'Collapse Events Panel' : 'Expand Events Panel'}>
          <IconButton size="small" onClick={() => setRightOpen((o) => !o)}
            sx={{ color: rightOpen ? t.brandPrimary : t.textSecondary, bgcolor: rightOpen ? 'rgba(21,61,117,.1)' : 'transparent', borderRadius: '8px', border: `1px solid ${rightOpen ? t.brandPrimary : t.border}` }}>
            <NotificationsNoneIcon sx={{ fontSize: '1.1rem' }} />
            {events.some((e) => e.type === 'error' || e.type === 'warn') && (
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dashboardSemanticColors.danger, position: 'absolute', top: 3, right: 3 }} />
            )}
          </IconButton>
        </Tooltip>

        <Avatar sx={{ width: 28, height: 28, bgcolor: t.brandPrimary, fontSize: '.75rem', fontWeight: 700 }}>
          {ws.owner?.[0]?.toUpperCase() ?? 'U'}
        </Avatar>
      </Box>

      {/* ════════════════ BODY ══════════════════════════════════════════════ */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* ─── LEFT SIDEBAR (GitLab-style) ─────────────────────────────── */}
        <Box sx={{ width: leftOpen ? 220 : 52, flexShrink: 0, borderRight: `1px solid ${t.border}`, bgcolor: t.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width .18s ease' }}>
          <Box sx={{ py: 1.5, flex: 1, overflowY: 'auto' }}>
            {SIDEBAR_ITEMS.map((item) => {
              const active = section === item.id;
              return (
                <React.Fragment key={item.id}>
                  {item.dividerBefore && (
                    <Divider sx={{ borderColor: t.border, my: 0.75, mx: 1.5 }} />
                  )}
                  <Tooltip title={leftOpen ? '' : item.label} placement="right">
                    <Box onClick={() => {
                      if (item.id === 'connect-project') { setProjectModalOpen(true); return; }
                      if (item.id === 'connect-env')     { setEnvModalOpen(true);     return; }
                      if (item.id === 'trigger-pipeline') { openPipelineModal();       return; }
                      setSection(item.id as Section);
                    }}
                      sx={{ display: 'flex', alignItems: 'center', gap: leftOpen ? 1.25 : 0, justifyContent: leftOpen ? 'flex-start' : 'center',
                        px: leftOpen ? 1.75 : 0, py: 0.9, mx: 0.75, borderRadius: '8px', cursor: 'pointer', transition: 'background .15s',
                        bgcolor: active ? 'rgba(21,61,117,.12)' : 'transparent',
                        borderLeft: active ? `2px solid ${t.brandPrimary}` : '2px solid transparent',
                        '&:hover': { bgcolor: active ? 'rgba(21,61,117,.12)' : t.surfaceHover },
                      }}>
                      <Box sx={{ color: active ? t.brandPrimary : t.textSecondary, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {item.icon}
                      </Box>
                      {leftOpen && (
                        <>
                          <Typography sx={{ fontWeight: active ? 700 : 500, fontSize: '.83rem', color: active ? t.textPrimary : t.textSecondary, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {item.label}
                          </Typography>
                          {/* Badge: green dot on connected project / env, running dot on pipeline */}
                          {item.id === 'connect-project' && connectedProject && (
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dashboardSemanticColors.success, ml: 'auto', flexShrink: 0 }} />
                          )}
                          {item.id === 'connect-env' && connectedEnv && (
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%',
                              bgcolor: connectedEnv.health === 'healthy' ? dashboardSemanticColors.success : dashboardSemanticColors.warning,
                              ml: 'auto', flexShrink: 0 }} />
                          )}
                          {item.id === 'trigger-pipeline' && activePipeline?.status === 'running' && (
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dashboardSemanticColors.info, ml: 'auto', flexShrink: 0,
                              animation: 'pulse 1.4s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: .35 } } }} />
                          )}
                          {active && !['connect-project','connect-env','trigger-pipeline'].includes(item.id) && (
                            <ChevronRightIcon sx={{ fontSize: '.8rem', color: t.brandPrimary, ml: 'auto' }} />
                          )}
                        </>
                      )}
                    </Box>
                  </Tooltip>
                </React.Fragment>
              );
            })}
          </Box>

          <Divider sx={{ borderColor: t.border }} />
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {leftOpen && (
              <Button fullWidth size="small" startIcon={<OpenInNewIcon sx={{ fontSize: '.8rem' }} />}
                onClick={() => navigate('/developer/Dashboard/workspace')}
                sx={{ textTransform: 'none', color: t.textSecondary, fontWeight: 600, fontSize: '.78rem', justifyContent: 'flex-start', borderRadius: '8px', '&:hover': { color: t.textPrimary, bgcolor: t.surfaceHover } }}>
                All Workspaces
              </Button>
            )}
            <Tooltip title={leftOpen ? '' : 'Expand sidebar'} placement="right">
              <IconButton size="small" onClick={() => setLeftOpen(o => !o)}
                sx={{ borderRadius: '8px', color: t.textSecondary, alignSelf: leftOpen ? 'flex-end' : 'center', '&:hover': { bgcolor: t.surfaceHover, color: t.textPrimary } }}>
                {leftOpen ? <ChevronLeftIcon sx={{ fontSize: '1.1rem' }} /> : <ChevronRightIcon sx={{ fontSize: '1.1rem' }} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ─── CENTER PANEL (hard tab switching) ───────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, bgcolor: t.background }}>
          {renderCenter()}
        </Box>

        {/* ─── RIGHT PANEL (collapsible) ───────────────────────────────── */}
        <Box sx={{ width: rightOpen ? 280 : 36, flexShrink: 0, borderLeft: `1px solid ${t.border}`, bgcolor: t.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width .18s ease' }}>
          {/* Collapsed strip — just a toggle button */}
          {!rightOpen && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1.5 }}>
              <Tooltip title="Open Events Panel" placement="left">
                <IconButton size="small" onClick={() => setRightOpen(true)} sx={{ color: t.textSecondary, '&:hover': { color: t.brandPrimary } }}>
                  <NotificationsNoneIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          {rightOpen && (
            <>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <NotificationsNoneIcon sx={{ fontSize: '1rem', color: t.textSecondary }} />
                <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>Events</Typography>
              </Stack>
              <Tooltip title="Collapse panel">
                <IconButton size="small" onClick={() => setRightOpen(false)} sx={{ color: t.textSecondary }}>
                  <ChevronRightIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1, px: 0.5 }}>System Events</Typography>
              <Stack spacing={0.75}>
                {events.map((e, i) => (
                  <Box key={i} sx={{ p: 1.25, borderRadius: '8px', bgcolor: e.type === 'error' ? `${dashboardSemanticColors.danger}10` : e.type === 'warn' ? `${dashboardSemanticColors.warning}10` : t.surfaceSubtle, border: `1px solid ${e.type === 'error' ? `${dashboardSemanticColors.danger}30` : e.type === 'warn' ? `${dashboardSemanticColors.warning}30` : t.border}` }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      {e.type === 'error' ? <ErrorOutlineIcon sx={{ fontSize: '.9rem', color: dashboardSemanticColors.danger, mt: '1px', flexShrink: 0 }} />
                       : e.type === 'warn' ? <WarningAmberIcon sx={{ fontSize: '.9rem', color: dashboardSemanticColors.warning, mt: '1px', flexShrink: 0 }} />
                       : e.type === 'success' ? <CheckCircleIcon sx={{ fontSize: '.9rem', color: dashboardSemanticColors.success, mt: '1px', flexShrink: 0 }} />
                       : <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: t.textTertiary, mt: '5px', flexShrink: 0 }} />}
                      <Box>
                        <Typography sx={{ fontSize: '.78rem', color: t.textPrimary, fontWeight: 500, lineHeight: 1.35 }}>{e.msg}</Typography>
                        <Typography sx={{ fontSize: '.68rem', color: t.textTertiary }}>{e.time}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ borderColor: t.border, my: 1.5 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1, px: 0.5 }}>Running Processes</Typography>
              {isRunning ? (
                <Stack spacing={0.75}>
                  {[
                    { name: 'vscode-server', cpu: `${Math.max(1, ws.cpu_percent - 4)}%`, mem: `${Math.max(5, ws.ram_percent - 8)}%` },
                    { name: 'node',          cpu: '3%',  mem: '6%' },
                    { name: 'bash',          cpu: '0%',  mem: '1%' },
                  ].map((p) => (
                    <Box key={p.name} sx={{ p: 1, borderRadius: '6px', bgcolor: t.surfaceSubtle }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '.75rem', color: t.textPrimary }}>{p.name}</Typography>
                        <Stack direction="row" spacing={0.75}>
                          <Typography sx={{ fontSize: '.68rem', color: t.textTertiary }}>CPU {p.cpu}</Typography>
                          <Typography sx={{ fontSize: '.68rem', color: t.textTertiary }}>MEM {p.mem}</Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: '.78rem', color: t.textSecondary, px: 0.5 }}>No active processes.</Typography>
              )}

              {/* ── Connected Project ─────────────────────────────────────── */}
              {connectedProject && (
                <>
                  <Divider sx={{ borderColor: t.border, my: 1.5 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1, px: 0.5 }}>
                    Connected Project
                  </Typography>
                  <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: t.surfaceSubtle, border: `1px solid ${t.brandPrimary}20` }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 26, height: 26, borderRadius: '6px', bgcolor: t.brandPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '.72rem', color: '#fff' }}>{connectedProject.name[0]?.toUpperCase()}</Typography>
                      </Box>
                      <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {connectedProject.name}
                        </Typography>
                        <Typography sx={{ fontSize: '.68rem', color: t.textTertiary, fontFamily: 'monospace' }}>{connectedProject.project_key}</Typography>
                      </Box>
                      <Tooltip title="View project">
                        <IconButton size="small" onClick={() => navigate(`/developer/Dashboard/projects/${connectedProject.id}`)}
                          sx={{ color: t.textTertiary, '&:hover': { color: t.brandPrimary } }}>
                          <OpenInNewIcon sx={{ fontSize: '.8rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Stack direction="row" spacing={2} mt={1}>
                      <Box>
                        <Typography sx={{ fontSize: '.68rem', color: t.textTertiary }}>Repos</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>{connectedProject.repo_count}</Typography>
                      </Box>
                      {connectedProject.last_activity && (
                        <Box>
                          <Typography sx={{ fontSize: '.68rem', color: t.textTertiary }}>Activity</Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: '.82rem', color: t.textPrimary }}>{connectedProject.last_activity}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </>
              )}

              {/* ── Connected Environment ─────────────────────────────────── */}
              {connectedEnv && (() => {
                const healthColor = connectedEnv.health === 'healthy' ? dashboardSemanticColors.success
                                  : connectedEnv.health === 'degraded' ? dashboardSemanticColors.warning
                                  : dashboardSemanticColors.danger;
                return (
                  <>
                    <Divider sx={{ borderColor: t.border, my: 1.5 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1, px: 0.5 }}>
                      Environment
                    </Typography>
                    <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: t.surfaceSubtle, border: `1px solid ${healthColor}25` }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: healthColor, flexShrink: 0 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textPrimary }}>{connectedEnv.name}</Typography>
                        <Chip label={connectedEnv.health} size="small"
                          sx={{ fontSize: '.65rem', fontWeight: 700, height: 18, bgcolor: `${healthColor}18`, color: healthColor, ml: 'auto' }} />
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <Box>
                          <Typography sx={{ fontSize: '.68rem', color: t.textTertiary }}>Version</Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textPrimary, fontFamily: 'monospace' }}>{connectedEnv.version}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '.68rem', color: t.textTertiary }}>Last Deploy</Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: '.78rem', color: t.textPrimary }}>{connectedEnv.lastDeploy}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </>
                );
              })()}

              {/* ── Group Resources (from connected group's control plane) ── */}
              {groupSidebar && groupSidebar.sections.length > 0 && (
                <>
                  <Divider sx={{ borderColor: t.border, my: 1.5 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1, px: 0.5 }}>
                    Group Resources
                  </Typography>
                  <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: t.surfaceSubtle, border: `1px solid ${t.brandPrimary}20` }}>
                    <Stack spacing={0.6}>
                      {groupSidebar.sections.filter(s => s.count > 0).map(s => (
                        <Stack key={s.id} direction="row" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ fontSize: '.76rem', color: t.textSecondary, textTransform: 'capitalize' }}>
                            {s.label}
                          </Typography>
                          <Chip label={s.count} size="small" sx={{ height: 18, fontSize: '.68rem', fontWeight: 700,
                            bgcolor: `${t.brandPrimary}18`, color: t.brandPrimary, minWidth: 24 }} />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </>
              )}

              {/* ── Active Pipeline ───────────────────────────────────────── */}
              {activePipeline && (
                <>
                  <Divider sx={{ borderColor: t.border, my: 1.5 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '.72rem', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1, px: 0.5 }}>
                    Pipeline Run
                  </Typography>
                  <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: t.surfaceSubtle, border: `1px solid ${dashboardSemanticColors.info}25` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
                      <Typography sx={{ fontWeight: 700, fontSize: '.8rem', color: t.textPrimary, fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                        {activePipeline.name}
                      </Typography>
                      <Chip label={activePipeline.status} size="small"
                        sx={{ fontSize: '.65rem', fontWeight: 700, height: 18,
                          bgcolor: activePipeline.status === 'running' ? `${dashboardSemanticColors.info}18`
                                : activePipeline.status === 'passed' ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                          color: activePipeline.status === 'running' ? dashboardSemanticColors.info
                               : activePipeline.status === 'passed'  ? dashboardSemanticColors.success : dashboardSemanticColors.danger }} />
                    </Stack>
                    <Typography sx={{ fontSize: '.7rem', color: t.textTertiary, fontFamily: 'monospace', mb: 0.5 }}>branch: {activePipeline.branch}</Typography>
                    <Typography sx={{ fontSize: '.68rem', color: t.textTertiary }}>Started: {new Date(activePipeline.startedAt).toLocaleTimeString()}</Typography>
                  </Box>
                </>
              )}
            </Box>
            </>
          )}
        </Box>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />

      {/* ── Integration modals ─────────────────────────────────────────────── */}
      <ProjectSelectModal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} onSelect={handleConnectProject} />
      <EnvSelectModal open={envModalOpen} project={connectedProject} onClose={() => setEnvModalOpen(false)} onSelect={handleConnectEnv} />
      <TriggerPipelineModal open={pipelineModalOpen} project={connectedProject} onClose={() => setPipelineModalOpen(false)} onTriggered={handleTriggerPipeline} />
      <WorkspaceSetupWizard
        open={setupWizardOpen}
        workspace={ws}
        onClose={() => setSetupWizardOpen(false)}
        onCompleted={handleSetupCompleted}
      />
    </Box>
  );
};

export default WorkspaceDashboardPage;
