// OrcaCloud Enterprise Docs Module
// Full collaboration knowledge platform with block editor, spaces, versioning, and governance
// Implements the enterprise brain specification

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, TextField, Chip, Avatar, Tooltip,
  Paper, Divider, Menu, MenuItem, ListItemIcon, ListItemText, Dialog,
  DialogTitle, DialogContent, DialogActions, Stack, InputAdornment,
  Breadcrumbs, Link, Badge, Select, FormControl, InputLabel, Tabs, Tab,
  Card, CardContent, List, ListItem, ListItemButton, Collapse, AvatarGroup,
  Switch, FormControlLabel, Alert, Grid,
} from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';

// Icons
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FolderIcon from '@mui/icons-material/Folder';
import ArticleIcon from '@mui/icons-material/Article';
import StyleIcon from '@mui/icons-material/Style';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import TableChartIcon from '@mui/icons-material/TableChart';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RateReviewIcon from '@mui/icons-material/RateReview';

// Types
interface DocBlock {
  id: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'numberedList' |
        'checklist' | 'quote' | 'code' | 'image' | 'video' | 'table' | 'divider' | 'callout';
  content: string;
  order: number;
  metadata?: Record<string, any>;
}

interface DocPage {
  id: string;
  title: string;
  icon: string;
  coverImage?: string;
  spaceId: string;
  parentPageId?: string;
  blocks: DocBlock[];
  status: 'draft' | 'in_review' | 'published' | 'archived';
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  permissions: DocPermission[];
  subpages?: DocPage[];
}

interface DocSpace {
  id: string;
  name: string;
  type: 'organization' | 'team' | 'private';
  icon: string;
  teamId?: string;
  visibility: 'public' | 'team' | 'private';
  pageCount: number;
}

interface DocPermission {
  userId?: string;
  teamId?: string;
  level: 'view' | 'comment' | 'edit' | 'admin';
}

interface DocVersion {
  id: string;
  pageId: string;
  versionNumber: number;
  diff: string;
  createdBy: string;
  createdAt: string;
}

interface DocComment {
  id: string;
  pageId: string;
  blockId?: string;
  content: string;
  createdBy: string;
  createdAt: string;
  resolved: boolean;
}

interface DocTemplate {
  id: string;
  name: string;
  description: string;
  type: 'sop' | 'runbook' | 'api_reference' | 'onboarding' | 'meeting_notes' | 'project_doc';
  blocks: DocBlock[];
  icon: string;
}

// Theme-aware colors
const getDocTheme = (isDark: boolean) => ({
  bg: {
    primary: isDark ? '#1A1D23' : '#FFFFFF',
    secondary: isDark ? '#252930' : '#F8F9FA',
    tertiary: isDark ? '#2D3139' : '#F3F4F6',
    hover: isDark ? '#353A44' : '#F5F7FA',
    active: isDark ? '#3F4551' : '#EBF0F5',
  },
  text: {
    primary: isDark ? '#F3F4F6' : '#111827',
    secondary: isDark ? '#9CA3AF' : '#6B7280',
    tertiary: isDark ? '#6B7280' : '#9CA3AF',
    link: isDark ? '#60A5FA' : '#2563EB',
  },
  border: {
    light: isDark ? '#374151' : '#E5E7EB',
    medium: isDark ? '#4B5563' : '#D1D5DB',
    dark: isDark ? '#6B7280' : '#9CA3AF',
  },
  accent: {
    blue: isDark ? '#3B82F6' : '#2563EB',
    green: isDark ? '#34D399' : '#10B981',
    yellow: isDark ? '#FBBF24' : '#F59E0B',
    red: isDark ? '#F87171' : '#EF4444',
    purple: isDark ? '#A78BFA' : '#8B5CF6',
  },
  sidebar: {
    bg: isDark ? '#1F2329' : '#FAFBFC',
    hover: isDark ? '#2A2F37' : '#F0F2F5',
    active: isDark ? '#353A44' : '#E4E8ED',
  },
});

// Sample data (replace with API calls)
const SAMPLE_SPACES: DocSpace[] = [
  { id: 'org-1', name: 'Organization', type: 'organization', icon: 'ORG', visibility: 'public', pageCount: 45 },
  { id: 'team-eng', name: 'Engineering', type: 'team', icon: 'ENG', teamId: 't1', visibility: 'team', pageCount: 128 },
  { id: 'team-marketing', name: 'Marketing', type: 'team', icon: 'MKT', teamId: 't2', visibility: 'team', pageCount: 67 },
  { id: 'team-sales', name: 'Sales', type: 'team', icon: 'SAL', teamId: 't3', visibility: 'team', pageCount: 34 },
  { id: 'private-1', name: 'My Private Docs', type: 'private', icon: 'DOC', visibility: 'private', pageCount: 12 },
];

const SAMPLE_TEMPLATES: DocTemplate[] = [
  {
    id: 't1',
    name: 'Standard Operating Procedure',
    description: 'Template for creating detailed operational procedures',
    type: 'sop',
    icon: 'SOP',
    blocks: [
      { id: 'b1', type: 'heading1', content: 'SOP Title', order: 0 },
      { id: 'b2', type: 'heading2', content: 'Purpose', order: 1 },
      { id: 'b3', type: 'paragraph', content: 'Describe the purpose of this SOP...', order: 2 },
      { id: 'b4', type: 'heading2', content: 'Scope', order: 3 },
      { id: 'b5', type: 'paragraph', content: 'Define who this applies to...', order: 4 },
      { id: 'b6', type: 'heading2', content: 'Procedure', order: 5 },
      { id: 'b7', type: 'numberedList', content: 'Step 1\nStep 2\nStep 3', order: 6 },
    ],
  },
  {
    id: 't2',
    name: 'Runbook',
    description: 'Step-by-step operational guide for systems',
    type: 'runbook',
    icon: 'RUN',
    blocks: [
      { id: 'b1', type: 'heading1', content: 'Runbook: [System Name]', order: 0 },
      { id: 'b2', type: 'callout', content: 'Critical: Review prerequisites before executing', order: 1 },
      { id: 'b3', type: 'heading2', content: 'Prerequisites', order: 2 },
      { id: 'b4', type: 'checklist', content: 'Verify system access\nCheck environment status\nNotify team', order: 3 },
      { id: 'b5', type: 'heading2', content: 'Execution Steps', order: 4 },
      { id: 'b6', type: 'numberedList', content: 'Step 1\nStep 2\nStep 3', order: 5 },
      { id: 'b7', type: 'heading2', content: 'Rollback Procedure', order: 6 },
      { id: 'b8', type: 'paragraph', content: 'If issues occur...', order: 7 },
    ],
  },
  {
    id: 't3',
    name: 'API Documentation',
    description: 'Technical reference for API endpoints',
    type: 'api_reference',
    icon: 'API',
    blocks: [
      { id: 'b1', type: 'heading1', content: 'API: [Endpoint Name]', order: 0 },
      { id: 'b2', type: 'paragraph', content: 'Overview of API functionality...', order: 1 },
      { id: 'b3', type: 'heading2', content: 'Endpoint', order: 2 },
      { id: 'b4', type: 'code', content: 'POST /api/v1/resource', order: 3 },
      { id: 'b5', type: 'heading2', content: 'Request Body', order: 4 },
      { id: 'b6', type: 'code', content: '{\n  "key": "value"\n}', order: 5 },
      { id: 'b7', type: 'heading2', content: 'Response', order: 6 },
      { id: 'b8', type: 'code', content: '{\n  "id": "123"\n}', order: 7 },
    ],
  },
  {
    id: 't4',
    name: 'Meeting Notes',
    description: 'Capture meeting discussions and action items',
    type: 'meeting_notes',
    icon: 'NOTE',
    blocks: [
      { id: 'b1', type: 'heading1', content: 'Meeting: [Title] - [Date]', order: 0 },
      { id: 'b2', type: 'heading2', content: 'Attendees', order: 1 },
      { id: 'b3', type: 'bulletList', content: 'Person 1\nPerson 2', order: 2 },
      { id: 'b4', type: 'heading2', content: 'Agenda', order: 3 },
      { id: 'b5', type: 'numberedList', content: 'Topic 1\nTopic 2', order: 4 },
      { id: 'b6', type: 'heading2', content: 'Action Items', order: 5 },
      { id: 'b7', type: 'checklist', content: 'Action 1 - Owner\nAction 2 - Owner', order: 6 },
    ],
  },
];

const SAMPLE_PAGE: DocPage = {
  id: 'page-1',
  title: 'Getting Started with OrcaCloud Platform',
  icon: 'START',
  spaceId: 'org-1',
  blocks: [
    { id: 'b1', type: 'paragraph', content: 'Welcome to the OrcaCloud enterprise cloud platform. This guide will help you understand the core concepts and get started with your first deployment.', order: 0 },
    { id: 'b2', type: 'heading2', content: 'Core Concepts', order: 1 },
    { id: 'b3', type: 'paragraph', content: 'The platform is built around several key concepts:', order: 2 },
    { id: 'b4', type: 'bulletList', content: 'Organizations - Top-level entities\nTeams - Collaborative groups\nProjects - Application containers\nEnvironments - Deployment targets', order: 3 },
    { id: 'b5', type: 'heading2', content: 'Quick Start', order: 4 },
    { id: 'b6', type: 'numberedList', content: 'Create an organization\nInvite team members\nCreate your first project\nDeploy your application', order: 5 },
    { id: 'b7', type: 'callout', content: 'Tip: Start with a small pilot project to familiarize yourself with the platform', order: 6 },
    { id: 'b8', type: 'heading2', content: 'Code Example', order: 7 },
    { id: 'b9', type: 'code', content: '# Deploy your application\norcacloud deploy --project my-app --env production', order: 8 },
  ],
  status: 'published',
  createdBy: 'user-1',
  updatedBy: 'user-2',
  createdAt: '2026-02-15T10:00:00Z',
  updatedAt: '2026-03-01T14:30:00Z',
  tags: ['getting-started', 'onboarding', 'platform'],
  permissions: [],
  subpages: [
    {
      id: 'page-1-1',
      title: 'Organizations & Teams',
      icon: 'TEAM',
      spaceId: 'org-1',
      parentPageId: 'page-1',
      blocks: [],
      status: 'published',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: '2026-02-20T10:00:00Z',
      updatedAt: '2026-02-20T10:00:00Z',
      tags: ['teams', 'organizations'],
      permissions: [],
    },
    {
      id: 'page-1-2',
      title: 'Projects & Deployments',
      icon: 'APP',
      spaceId: 'org-1',
      parentPageId: 'page-1',
      blocks: [],
      status: 'published',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: '2026-02-21T10:00:00Z',
      updatedAt: '2026-02-21T10:00:00Z',
      tags: ['projects', 'deployments'],
      permissions: [],
    },
  ],
};

interface EnterpriseDocsModuleProps {
  organizationId?: string;
  teamId?: string;
  mode?: 'full' | 'embedded';
}

const EnterpriseDocsModule: React.FC<EnterpriseDocsModuleProps> = ({
  organizationId,
  teamId,
  mode = 'full',
}) => {
  // Theme
  const { mode: themeMode, toggleTheme } = useTheme();
  const isDark = themeMode === 'dark';
  const navigate = useNavigate();
  const T = getDocTheme(isDark);

  // State
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<DocPage>(SAMPLE_PAGE);
  const [spaces, setSpaces] = useState<DocSpace[]>(SAMPLE_SPACES);
  const [selectedSpace, setSelectedSpace] = useState<DocSpace | null>(SAMPLE_SPACES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['page-1']);
  const [recentPages, setRecentPages] = useState<DocPage[]>([SAMPLE_PAGE]);
  const [editMode, setEditMode] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [activeCollaborators] = useState([
    { id: 'u1', name: 'Sarah Chen', avatar: '', color: '#2563EB' },
    { id: 'u2', name: 'James Wilson', avatar: '', color: '#10B981' },
  ]);

  // Block editor state
  const [blocks, setBlocks] = useState<DocBlock[]>(SAMPLE_PAGE.blocks);
  const [blockMenuAnchor, setBlockMenuAnchor] = useState<null | HTMLElement>(null);
  const [blockMenuPosition, setBlockMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Handlers
  const toggleFavorite = (pageId: string) => {
    setFavorites(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const handleBlockChange = (blockId: string, newContent: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: newContent } : b));
  };

  const addBlock = (type: DocBlock['type'], afterBlockId?: string) => {
    const newBlock: DocBlock = {
      id: `block-${Date.now()}`,
      type,
      content: '',
      order: afterBlockId ? blocks.find(b => b.id === afterBlockId)!.order + 1 : blocks.length,
    };
    setBlocks(prev => [...prev, newBlock].sort((a, b) => a.order - b.order));
    setBlockMenuAnchor(null);
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    newBlocks[index].order = index;
    newBlocks[targetIndex].order = targetIndex;
    setBlocks(newBlocks);
  };

  const handleSlashCommand = (e: React.KeyboardEvent, blockId: string) => {
    if (e.key === '/' && (e.target as HTMLInputElement).value === '') {
      e.preventDefault();
      setSelectedBlock(blockId);
      // Open menu at fixed position below the block
      const element = e.currentTarget as HTMLElement;
      const rect = element.getBoundingClientRect();
      const fakeAnchor = {
        getBoundingClientRect: () => ({
          left: rect.left,
          top: rect.bottom,
          right: rect.left,
          bottom: rect.bottom,
          width: 0,
          height: 0,
          x: rect.left,
          y: rect.bottom,
          toJSON: () => ({}),
        }),
      };
      setBlockMenuAnchor(fakeAnchor as any);
    }
  };

  const applyTemplate = (template: DocTemplate) => {
    setBlocks(template.blocks);
    setCurrentPage(prev => ({ ...prev, title: template.name }));
    setShowTemplateDialog(false);
  };

  // Render functions
  const renderBlock = (block: DocBlock, index: number) => {
    const isSelected = selectedBlock === block.id;

    const blockStyle = {
      mb: 2,
      p: isSelected ? 1.5 : 1,
      borderRadius: 1,
      border: isSelected ? `2px solid ${T.accent.blue}` : '2px solid transparent',
      '&:hover': {
        bgcolor: editMode ? T.bg.hover : 'transparent',
        '& .block-actions': { opacity: 1 },
      },
    };

    const commonProps = {
      fullWidth: true,
      multiline: true,
      variant: 'standard' as const,
      value: block.content,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleBlockChange(block.id, e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => handleSlashCommand(e, block.id),
      onClick: () => setSelectedBlock(block.id),
      InputProps: { disableUnderline: true },
      disabled: !editMode,
    };

    return (
      <Box key={block.id} sx={blockStyle} position="relative">
        {editMode && (
          <Box className="block-actions" sx={{ position: 'absolute', left: -40, top: 8, opacity: 0, transition: 'opacity 0.2s' }}>
            <Stack direction="column" spacing={0.5}>
              <Tooltip title="Drag to reorder">
                <IconButton size="small" sx={{ cursor: 'grab' }}>
                  <DragIndicatorIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Add block">
                <IconButton size="small" onClick={() => addBlock('paragraph', block.id)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete block">
                <IconButton size="small" onClick={() => deleteBlock(block.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        )}

        {block.type === 'heading1' && (
          <TextField {...commonProps} sx={{ '& input': { fontSize: 32, fontWeight: 700, color: T.text.primary } }} placeholder="Heading 1" />
        )}
        {block.type === 'heading2' && (
          <TextField {...commonProps} sx={{ '& input': { fontSize: 24, fontWeight: 600, color: T.text.primary } }} placeholder="Heading 2" />
        )}
        {block.type === 'heading3' && (
          <TextField {...commonProps} sx={{ '& input': { fontSize: 20, fontWeight: 600, color: T.text.primary } }} placeholder="Heading 3" />
        )}
        {block.type === 'paragraph' && (
          <TextField {...commonProps} sx={{ '& textarea': { fontSize: 16, color: T.text.primary, lineHeight: 1.6 } }} placeholder="Start typing or press / for commands..." />
        )}
        {block.type === 'bulletList' && (
          <TextField {...commonProps} sx={{ '& textarea': { fontSize: 16, color: T.text.primary, pl: 2 } }} placeholder="• List item" />
        )}
        {block.type === 'numberedList' && (
          <TextField {...commonProps} sx={{ '& textarea': { fontSize: 16, color: T.text.primary, pl: 2 } }} placeholder="1. List item" />
        )}
        {block.type === 'checklist' && (
          <TextField {...commonProps} sx={{ '& textarea': { fontSize: 16, color: T.text.primary, pl: 2 } }} placeholder="Checklist item" />
        )}
        {block.type === 'quote' && (
          <Paper sx={{ p: 2, bgcolor: T.bg.tertiary, borderLeft: `4px solid ${T.accent.blue}` }}>
            <TextField {...commonProps} sx={{ '& textarea': { fontSize: 16, color: T.text.secondary, fontStyle: 'italic' } }} placeholder="Quote..." />
          </Paper>
        )}
        {block.type === 'code' && (
          <Paper sx={{ p: 2, bgcolor: isDark ? '#1E1E1E' : '#F7F7F7', color: isDark ? '#D4D4D4' : '#1E1E1E', fontFamily: 'monospace', borderRadius: 1, border: `1px solid ${T.border.light}` }}>
            <TextField
              {...commonProps}
              sx={{ '& textarea': { fontSize: 14, color: isDark ? '#D4D4D4' : '#1E1E1E', fontFamily: 'monospace' } }}
              placeholder="Code block..."
            />
          </Paper>
        )}
        {block.type === 'callout' && (
          <Paper sx={{ p: 2, bgcolor: isDark ? 'rgba(251, 191, 36, 0.1)' : '#FEF3C7', border: `1px solid ${T.accent.yellow}`, borderRadius: 1 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <InfoIcon sx={{ color: T.accent.yellow, mt: 0.5 }} />
              <TextField {...commonProps} sx={{ '& textarea': { fontSize: 16, color: T.text.primary } }} placeholder="Callout text..." />
            </Stack>
          </Paper>
        )}
        {block.type === 'divider' && (
          <Divider sx={{ my: 2 }} />
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: T.bg.primary }}>
      {/* Left Sidebar - Spaces & Navigation */}
      {leftSidebarOpen && (
        <Box
          sx={{
            width: 280,
            bgcolor: T.sidebar.bg,
            borderRight: `1px solid ${T.border.light}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2, borderBottom: `1px solid ${T.border.light}` }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <MenuBookIcon sx={{ color: T.accent.blue, fontSize: 28 }} />
              <Typography variant="h6" fontWeight={700} color={T.text.primary}>
                Docs
              </Typography>
            </Stack>

            <TextField
              size="small"
              fullWidth
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: T.text.tertiary }} />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: T.bg.primary, borderRadius: 1 }}
            />

            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowTemplateDialog(true)}
              sx={{ mt: 2, bgcolor: T.accent.blue, textTransform: 'none', fontWeight: 600 }}
            >
              New Page
            </Button>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {/* Quick Links */}
            <Box mb={3}>
              <Typography variant="caption" sx={{ color: T.text.tertiary, fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                Quick Access
              </Typography>
              <List dense>
                <ListItemButton sx={{ borderRadius: 1, mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <StarIcon fontSize="small" sx={{ color: T.accent.yellow }} />
                  </ListItemIcon>
                  <ListItemText primary="Favorites" primaryTypographyProps={{ fontSize: 14 }} />
                  <Chip label={favorites.length} size="small" sx={{ height: 20, fontSize: 11 }} />
                </ListItemButton>
                <ListItemButton sx={{ borderRadius: 1, mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <AccessTimeIcon fontSize="small" sx={{ color: T.text.tertiary }} />
                  </ListItemIcon>
                  <ListItemText primary="Recent" primaryTypographyProps={{ fontSize: 14 }} />
                  <Chip label={recentPages.length} size="small" sx={{ height: 20, fontSize: 11 }} />
                </ListItemButton>
                <ListItemButton sx={{ borderRadius: 1, mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <StyleIcon fontSize="small" sx={{ color: T.text.tertiary }} />
                  </ListItemIcon>
                  <ListItemText primary="Templates" primaryTypographyProps={{ fontSize: 14 }} />
                  <Chip label={SAMPLE_TEMPLATES.length} size="small" sx={{ height: 20, fontSize: 11 }} />
                </ListItemButton>
              </List>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Spaces */}
            <Box>
              <Typography variant="caption" sx={{ color: T.text.tertiary, fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                Spaces
              </Typography>
              <List dense>
                {spaces.map(space => (
                  <ListItemButton
                    key={space.id}
                    onClick={() => setSelectedSpace(space)}
                    selected={selectedSpace?.id === space.id}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': { bgcolor: T.sidebar.active },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontSize={16}>{space.icon}</Typography>
                          <Typography fontSize={14} fontWeight={selectedSpace?.id === space.id ? 600 : 400}>
                            {space.name}
                          </Typography>
                        </Stack>
                      }
                    />
                    <Chip label={space.pageCount} size="small" sx={{ height: 20, fontSize: 11 }} />
                  </ListItemButton>
                ))}
              </List>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Settings */}
            <ListItemButton sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SettingsIcon fontSize="small" sx={{ color: T.text.tertiary }} />
              </ListItemIcon>
              <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: 14 }} />
            </ListItemButton>
          </Box>
        </Box>
      )}

      {/* Center Panel - Editor */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <Box sx={{ borderBottom: `1px solid ${T.border.light}`, bgcolor: T.bg.primary, p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center" flex={1}>
              <Tooltip title="Return to Workspace">
                <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: T.text.secondary }}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <IconButton size="small" onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}>
                <ViewSidebarIcon />
              </IconButton>

              <Breadcrumbs separator={<ChevronRightIcon fontSize="small" />}>
                <Link color="inherit" href="#" underline="hover" sx={{ fontSize: 13, color: T.text.secondary }}>
                  {selectedSpace?.name}
                </Link>
                <Typography fontSize={13} color={T.text.primary} fontWeight={600}>
                  {currentPage.title}
                </Typography>
              </Breadcrumbs>

              <Chip
                label={currentPage.status}
                size="small"
                icon={
                  currentPage.status === 'published' ? <CheckCircleIcon /> :
                  currentPage.status === 'in_review' ? <RateReviewIcon /> :
                  <EditIcon />
                }
                color={
                  currentPage.status === 'published' ? 'success' :
                  currentPage.status === 'in_review' ? 'warning' :
                  'default'
                }
                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}>
                {activeCollaborators.map(user => (
                  <Tooltip key={user.id} title={user.name}>
                    <Avatar sx={{ bgcolor: user.color }}>{user.name[0]}</Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>

              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

              <Tooltip title="Share">
                <IconButton size="small" onClick={() => setShowShareDialog(true)}>
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Version History">
                <IconButton size="small" onClick={() => setShowVersionHistory(true)}>
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title={favorites.includes(currentPage.id) ? "Remove from favorites" : "Add to favorites"}>
                <IconButton size="small" onClick={() => toggleFavorite(currentPage.id)}>
                  {favorites.includes(currentPage.id) ? <StarIcon fontSize="small" sx={{ color: T.accent.yellow }} /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              <Tooltip title="More">
                <IconButton size="small">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                <IconButton size="small" onClick={toggleTheme} sx={{ color: T.text.secondary }}>
                  {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

              <Button
                size="small"
                variant={editMode ? 'outlined' : 'contained'}
                startIcon={editMode ? <VisibilityIcon /> : <EditIcon />}
                onClick={() => setEditMode(!editMode)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {editMode ? 'View' : 'Edit'}
              </Button>

              {editMode && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  sx={{ bgcolor: T.accent.green, textTransform: 'none', fontWeight: 600 }}
                >
                  Save
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        {/* Page Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {/* Page Title */}
            <Stack direction="row" spacing={2} alignItems="flex-start" mb={4}>
              <Typography fontSize={48}>{currentPage.icon}</Typography>
              <Box flex={1}>
                <TextField
                  fullWidth
                  variant="standard"
                  value={currentPage.title}
                  onChange={(e) => setCurrentPage(prev => ({ ...prev, title: e.target.value }))}
                  InputProps={{ disableUnderline: true }}
                  disabled={!editMode}
                  sx={{
                    '& input': {
                      fontSize: 40,
                      fontWeight: 700,
                      color: T.text.primary,
                      padding: 0,
                    },
                  }}
                />
                <Stack direction="row" spacing={1} mt={1}>
                  {currentPage.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" sx={{ height: 24, fontSize: 12 }} />
                  ))}
                </Stack>
              </Box>
            </Stack>

            {/* Block Editor */}
            <Box>
              {blocks.map((block, index) => renderBlock(block, index))}

              {editMode && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addBlock('paragraph')}
                  sx={{
                    mt: 2,
                    borderStyle: 'dashed',
                    color: T.text.tertiary,
                    borderColor: T.border.light,
                    textTransform: 'none',
                    '&:hover': { borderStyle: 'dashed', bgcolor: T.bg.hover },
                  }}
                >
                  Add Block
                </Button>
              )}
            </Box>

            {/* Subpages */}
            {currentPage.subpages && currentPage.subpages.length > 0 && (
              <Box mt={6}>
                <Typography variant="h6" fontWeight={600} mb={2}>Subpages</Typography>
                <Stack spacing={1}>
                  {currentPage.subpages.map(subpage => (
                    <Paper
                      key={subpage.id}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: `1px solid ${T.border.light}`,
                        '&:hover': { bgcolor: T.bg.hover, borderColor: T.accent.blue },
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography fontSize={24}>{subpage.icon}</Typography>
                        <Box flex={1}>
                          <Typography fontWeight={600}>{subpage.title}</Typography>
                          <Stack direction="row" spacing={1} mt={0.5}>
                            {subpage.tags.map(tag => (
                              <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: 11 }} />
                            ))}
                          </Stack>
                        </Box>
                        <ChevronRightIcon sx={{ color: T.text.tertiary }} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Box>



      {/* Block Type Menu */}
      <Menu
        anchorEl={blockMenuAnchor}
        open={Boolean(blockMenuAnchor)}
        onClose={() => setBlockMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { bgcolor: T.bg.primary, backgroundImage: 'none' } }}
      >
        <MenuItem onClick={() => addBlock('paragraph', selectedBlock || undefined)}>
          <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Paragraph" secondary="Plain text block" />
        </MenuItem>
        <MenuItem onClick={() => addBlock('heading1', selectedBlock || undefined)}>
          <ListItemIcon><Typography fontWeight={700}>H1</Typography></ListItemIcon>
          <ListItemText primary="Heading 1" secondary="Large section title" />
        </MenuItem>
        <MenuItem onClick={() => addBlock('heading2', selectedBlock || undefined)}>
          <ListItemIcon><Typography fontWeight={700}>H2</Typography></ListItemIcon>
          <ListItemText primary="Heading 2" secondary="Medium section title" />
        </MenuItem>
        <MenuItem onClick={() => addBlock('heading3', selectedBlock || undefined)}>
          <ListItemIcon><Typography fontWeight={700}>H3</Typography></ListItemIcon>
          <ListItemText primary="Heading 3" secondary="Small section title" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => addBlock('bulletList', selectedBlock || undefined)}>
          <ListItemIcon><FormatListBulletedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Bullet List" secondary="Unordered list" />
        </MenuItem>
        <MenuItem onClick={() => addBlock('numberedList', selectedBlock || undefined)}>
          <ListItemIcon><FormatListNumberedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Numbered List" secondary="Ordered list" />
        </MenuItem>
        <MenuItem onClick={() => addBlock('checklist', selectedBlock || undefined)}>
          <ListItemIcon><CheckBoxIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Checklist" secondary="Task list" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => addBlock('quote', selectedBlock || undefined)}>
          <ListItemIcon><FormatQuoteIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Quote" secondary="Highlighted quote" />
        </MenuItem>
        <MenuItem onClick={() => addBlock('code', selectedBlock || undefined)}>
          <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Code" secondary="Code block" />
        </MenuItem>
        <MenuItem onClick={() => addBlock('callout', selectedBlock || undefined)}>
          <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Callout" secondary="Highlighted note" />
        </MenuItem>
        <MenuItem onClick={() => addBlock('divider', selectedBlock || undefined)}>
          <ListItemIcon><div style={{ width: 20, height: 2, background: '#ccc' }} /></ListItemIcon>
          <ListItemText primary="Divider" secondary="Visual separator" />
        </MenuItem>
      </Menu>

      {/* Template Dialog */}
      <Dialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: T.bg.primary, backgroundImage: 'none' } }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>Choose a Template</Typography>
            <IconButton size="small" onClick={() => setShowTemplateDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
            <Card
              sx={{
                cursor: 'pointer',
                border: `2px solid ${T.border.light}`,
                '&:hover': { borderColor: T.accent.blue, bgcolor: T.bg.hover },
              }}
              onClick={() => {
                setBlocks([{ id: 'b1', type: 'paragraph', content: '', order: 0 }]);
                setShowTemplateDialog(false);
              }}
            >
              <CardContent>
                <DescriptionIcon sx={{ fontSize: 32, mb: 1, color: T.accent.blue }} />
                <Typography fontWeight={600} mb={1}>Blank Page</Typography>
                <Typography fontSize={13} color={T.text.secondary}>
                  Start from scratch with an empty page
                </Typography>
              </CardContent>
            </Card>
            {SAMPLE_TEMPLATES.map(template => (
              <Card
                key={template.id}
                sx={{
                  cursor: 'pointer',
                  border: `2px solid ${T.border.light}`,
                  '&:hover': { borderColor: T.accent.blue, bgcolor: T.bg.hover },
                }}
                onClick={() => applyTemplate(template)}
              >
                <CardContent>
                  <Typography fontSize={32} mb={1}>{template.icon}</Typography>
                  <Typography fontWeight={600} mb={1}>{template.name}</Typography>
                  <Typography fontSize={13} color={T.text.secondary}>
                    {template.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: T.bg.primary, backgroundImage: 'none' } }}
      >
        <DialogTitle>Share Page</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Add people or teams..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="subtitle2" fontWeight={600}>Who has access</Typography>
            <Stack spacing={1}>
              <Paper sx={{ p: 2, border: `1px solid ${T.border.light}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32 }}>S</Avatar>
                    <Box>
                      <Typography fontSize={14} fontWeight={600}>Sarah Chen</Typography>
                      <Typography fontSize={12} color={T.text.tertiary}>sarah@orcacloud.com</Typography>
                    </Box>
                  </Stack>
                  <Select value="admin" size="small" sx={{ minWidth: 100 }}>
                    <MenuItem value="view">View</MenuItem>
                    <MenuItem value="comment">Comment</MenuItem>
                    <MenuItem value="edit">Edit</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </Stack>
              </Paper>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShareDialog(false)}>Close</Button>
          <Button variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnterpriseDocsModule;
