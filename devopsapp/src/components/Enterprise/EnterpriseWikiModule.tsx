// OrcaCloud Enterprise Wiki Module
// Full-screen standalone wiki page — no sidebar, platform-native theme

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import {
  Box, Typography, Button, IconButton, Tooltip, Chip, Paper,
  CircularProgress, Card, CardContent, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, Switch, FormControlLabel, Alert, Snackbar, Grid,
} from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';

// Icons
import ArrowBackIcon      from '@mui/icons-material/ArrowBack';
import LightModeIcon      from '@mui/icons-material/LightMode';
import DarkModeIcon       from '@mui/icons-material/DarkMode';
import MenuBookIcon       from '@mui/icons-material/MenuBook';
import AddIcon            from '@mui/icons-material/Add';
import SearchIcon         from '@mui/icons-material/Search';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import HistoryEduIcon     from '@mui/icons-material/HistoryEdu';
import LabelIcon          from '@mui/icons-material/Label';
import PushPinIcon        from '@mui/icons-material/PushPin';

// APIs & types
import { wikiCategoriesApi, wikiPagesApi } from '../../services/enterpriseApi';
import type { WikiCategory, WikiPageSummary, WikiPage, WikiPageVersion } from '../../services/enterpriseApi';

// ── Types ─────────────────────────────────────────────────────────────────────
type WikiView = 'all' | 'categories' | 'pinned' | 'recent';

interface Props {
  orgId: string;
  orgSlug?: string;
  orgName?: string;
}

const TABS: Array<{ key: WikiView; label: string }> = [
  { key: 'all',        label: 'All Pages'  },
  { key: 'pinned',     label: 'Pinned'     },
  { key: 'recent',     label: 'Recent'     },
  { key: 'categories', label: 'Categories' },
];

// ── Text-field sx helper (uses theme tokens) ──────────────────────────────────
const fieldSx = {
  '& .MuiInputBase-input'                    : { color: 'text.primary' },
  '& .MuiOutlinedInput-root fieldset'        : { borderColor: 'divider' },
  '& .MuiOutlinedInput-root:hover fieldset'  : { borderColor: 'text.secondary' },
  '& .MuiInputLabel-root'                    : { color: 'text.secondary' },
};

// ── Main Component ─────────────────────────────────────────────────────────────
const EnterpriseWikiModule: React.FC<Props> = ({ orgId, orgName = 'Wiki' }) => {
  const { mode: themeMode, toggleTheme } = useTheme();
  const isDark   = themeMode === 'dark';
  const muiTheme = useMuiTheme();
  const accent   = isDark ? '#3B82F6' : '#2563EB';
  const navigate = useNavigate();

  // Wiki state
  const [view,         setView]         = useState<WikiView>('all');
  const [pages,        setPages]        = useState<WikiPageSummary[]>([]);
  const [categories,   setCategories]   = useState<WikiCategory[]>([]);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [versions,     setVersions]     = useState<WikiPageVersion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [editing,      setEditing]      = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [snack,        setSnack]        = useState('');

  // Edit fields
  const [editTitle,   setEditTitle]   = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTags,    setEditTags]    = useState('');
  const [editCatIds,  setEditCatIds]  = useState<string[]>([]);
  const [editNote,    setEditNote]    = useState('');
  const [editPinned,  setEditPinned]  = useState(false);

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [catName,   setCatName]   = useState('');
  const [catColor,  setCatColor]  = useState('#3b82f6');
  const [catDesc,   setCatDesc]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, cs] = await Promise.all([
        wikiPagesApi.list(orgId, {
          q:       search     || undefined,
          category: filterCat || undefined,
          pinned:  view === 'pinned' ? true : undefined,
        }),
        wikiCategoriesApi.list(orgId),
      ]);
      setPages(ps);
      setCategories(cs);
    } catch { /* silent */ }
    setLoading(false);
  }, [orgId, search, filterCat, view]);

  useEffect(() => { load(); }, [load]);

  const openPage = async (p: WikiPageSummary) => {
    try {
      const full = await wikiPagesApi.get(orgId, p.id);
      setSelectedPage(full);
      setEditing(false); setCreating(false); setShowVersions(false);
    } catch { setSnack('Failed to load page'); }
  };

  const openEditor = (page?: WikiPage) => {
    if (page) {
      setEditTitle(page.title); setEditContent(page.content); setEditSummary(page.summary);
      setEditTags(page.tags.join(', ')); setEditCatIds(page.categories.map(c => c.id));
      setEditPinned(page.is_pinned); setEditing(true); setCreating(false);
    } else {
      setEditTitle(''); setEditContent(''); setEditSummary('');
      setEditTags(''); setEditCatIds([]); setEditPinned(false); setEditNote('');
      setCreating(true); setEditing(false); setSelectedPage(null);
    }
  };

  const save = async () => {
    const payload = {
      title:        editTitle,
      content:      editContent,
      summary:      editSummary,
      is_pinned:    editPinned,
      tags:         editTags.split(',').map(t => t.trim()).filter(Boolean),
      category_ids: editCatIds,
      version_note: editNote,
    };
    try {
      if (creating) {
        const p    = await wikiPagesApi.create(orgId, payload);
        const full = await wikiPagesApi.get(orgId, p.id);
        setSelectedPage(full); setSnack('Page created');
      } else if (selectedPage) {
        const p    = await wikiPagesApi.update(orgId, selectedPage.id, payload);
        const full = await wikiPagesApi.get(orgId, p.id);
        setSelectedPage(full); setSnack('Page saved');
      }
      setEditing(false); setCreating(false); load();
    } catch { setSnack('Failed to save page'); }
  };

  const deletePage = async (id: string) => {
    if (!window.confirm('Delete this page? This cannot be undone.')) return;
    try {
      await wikiPagesApi.delete(orgId, id);
      setSelectedPage(null); setSnack('Page deleted'); load();
    } catch { setSnack('Failed to delete page'); }
  };

  const loadVersions = async (pageId: string) => {
    const vs = await wikiPagesApi.versions(orgId, pageId);
    setVersions(vs); setShowVersions(true);
  };

  const restoreVersion = async (verId: string) => {
    if (!selectedPage) return;
    if (!window.confirm('Restore this version? Current content will be saved as a version.')) return;
    try {
      const p    = await wikiPagesApi.restore(orgId, selectedPage.id, verId);
      const full = await wikiPagesApi.get(orgId, p.id);
      setSelectedPage(full); setShowVersions(false); setSnack('Version restored'); load();
    } catch { setSnack('Failed to restore version'); }
  };

  const createCategory = async () => {
    try {
      await wikiCategoriesApi.create(orgId, { name: catName, color: catColor, description: catDesc });
      setSnack('Category created'); setCatDialog(false);
      setCatName(''); setCatColor('#3b82f6'); setCatDesc(''); load();
    } catch { setSnack('Failed to create category'); }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category?')) return;
    try { await wikiCategoriesApi.delete(orgId, id); setSnack('Category deleted'); load(); }
    catch { setSnack('Failed to delete category'); }
  };

  const filteredPages = pages.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  const borderColor = muiTheme.palette.divider;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default', overflow: 'hidden' }}>

      {/* ── Primary Toolbar ───────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: 2, py: 1.25, flexShrink: 0,
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <Tooltip title="Return to Workspace">
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <MenuBookIcon sx={{ fontSize: '1.1rem', color: accent }} />
        <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: '1rem' }}>
          {orgName} — Wiki
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Button
          size="small" variant="contained" startIcon={<AddIcon />}
          onClick={() => openEditor()}
          sx={{ bgcolor: accent, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: accent } }}
        >
          New Page
        </Button>

        <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          <IconButton size="small" onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
            {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left Sidebar ──────────────────────────────────────────────── */}
        <Box sx={{
          width: 260, flexShrink: 0,
          bgcolor: 'background.paper',
          borderRight: `1px solid ${borderColor}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Search */}
          <Box sx={{ p: 1.5, borderBottom: `1px solid ${borderColor}` }}>
            <TextField
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search pages…" size="small" fullWidth
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} /> }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '.82rem',
                  '& fieldset': { borderColor: 'divider' },
                  '&:hover fieldset': { borderColor: 'text.secondary' },
                },
                '& .MuiInputBase-input': { color: 'text.primary' },
              }}
            />
          </Box>

          {/* Nav items */}
          <Box sx={{ px: 1, py: 0.75, borderBottom: `1px solid ${borderColor}` }}>
            {TABS.map(n => (
              <Box
                key={n.key}
                onClick={() => { setView(n.key); setSelectedPage(null); setEditing(false); setCreating(false); setShowVersions(false); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 1.5, py: 0.75, borderRadius: 1.5, cursor: 'pointer', mb: 0.25,
                  bgcolor: view === n.key ? `${accent}20` : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography sx={{ color: view === n.key ? 'text.primary' : 'text.secondary', fontSize: '.83rem', fontWeight: view === n.key ? 600 : 400 }}>
                  {n.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Category filter */}
          {categories.length > 0 && view !== 'categories' && (
            <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${borderColor}` }}>
              <Typography sx={{ color: 'text.secondary', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 1, letterSpacing: '.06em' }}>
                Filter by Category
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip label="All" size="small"
                  onClick={() => setFilterCat('')}
                  sx={{ bgcolor: !filterCat ? accent : `${accent}15`, color: !filterCat ? '#fff' : 'text.secondary', fontSize: '.72rem', height: 22 }}
                />
                {categories.map(c => (
                  <Chip key={c.id} label={c.name} size="small"
                    onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)}
                    sx={{ bgcolor: filterCat === c.id ? c.color : `${c.color}20`, color: filterCat === c.id ? '#fff' : 'text.secondary', fontSize: '.72rem', height: 22 }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Page list */}
          <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
                <CircularProgress size={24} sx={{ color: accent }} />
              </Box>
            ) : filteredPages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <MenuBookIcon sx={{ color: 'text.secondary', fontSize: '2rem', mb: 1, opacity: 0.4 }} />
                <Typography sx={{ color: 'text.secondary', fontSize: '.82rem' }}>No pages yet</Typography>
              </Box>
            ) : (
              filteredPages.map(p => (
                <Box key={p.id} onClick={() => openPage(p)} sx={{
                  px: 2, py: 1.25, cursor: 'pointer',
                  bgcolor: selectedPage?.id === p.id ? `${accent}12` : 'transparent',
                  borderLeft: `3px solid ${selectedPage?.id === p.id ? accent : 'transparent'}`,
                  '&:hover': { bgcolor: 'action.hover' },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                    {p.is_pinned && <PushPinIcon sx={{ fontSize: '.75rem', color: accent }} />}
                    <Typography sx={{ color: 'text.primary', fontSize: '.85rem', fontWeight: 600, lineHeight: 1.25 }}>
                      {p.title}
                    </Typography>
                  </Box>
                  {p.summary && (
                    <Typography sx={{
                      color: 'text.secondary', fontSize: '.72rem', lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {p.summary}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {p.categories.slice(0, 2).map(c => (
                      <Chip key={c.id} label={c.name} size="small"
                        sx={{ bgcolor: `${c.color}20`, color: c.color, fontSize: '.65rem', height: 18, '& .MuiChip-label': { px: 0.75 } }} />
                    ))}
                  </Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '.68rem', mt: 0.5 }}>
                    {p.updated_by_name && `${p.updated_by_name} · `}
                    {new Date(p.updated_at).toLocaleDateString()}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* ── Right: Content Area ───────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 3 }}>

        {/* ── Categories view ─────────────────────────────────────────── */}
        {view === 'categories' && !creating && !editing && (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: '1.1rem' }}>Categories</Typography>
              <Button
                size="small" variant="outlined" startIcon={<AddIcon />}
                onClick={() => setCatDialog(true)}
                sx={{ borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: accent, color: accent } }}
              >
                New Category
              </Button>
            </Box>
            {categories.length === 0 ? (
              <Paper sx={{ bgcolor: 'background.paper', border: `1px solid ${borderColor}`, p: 4, textAlign: 'center', borderRadius: 2 }}>
                <LabelIcon sx={{ color: 'text.secondary', fontSize: '2.5rem', mb: 1 }} />
                <Typography sx={{ color: 'text.secondary' }}>No categories yet. Create one to organise your pages.</Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {categories.map(c => (
                  <Grid key={c.id} item xs={12} sm={6} md={4}>
                    <Card sx={{ bgcolor: 'background.paper', border: `1px solid ${borderColor}`, borderRadius: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c.color }} />
                            <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: '.95rem' }}>{c.name}</Typography>
                          </Box>
                          <IconButton size="small" onClick={() => deleteCategory(c.id)}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                            <DeleteIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Box>
                        {c.description && (
                          <Typography sx={{ color: 'text.secondary', fontSize: '.82rem', mb: 1 }}>{c.description}</Typography>
                        )}
                        <Chip
                          label={`${c.page_count} page${c.page_count !== 1 ? 's' : ''}`} size="small"
                          sx={{ bgcolor: `${c.color}20`, color: c.color, fontSize: '.72rem' }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* ── Page grid (no page selected) ───────────────────────────── */}
        {!selectedPage && !creating && !editing && view !== 'categories' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                <CircularProgress size={28} sx={{ color: accent }} />
              </Box>
            ) : filteredPages.length === 0 ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <MenuBookIcon sx={{ color: 'text.secondary', fontSize: '4rem', mb: 2, opacity: 0.3 }} />
                <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '1.1rem', mb: 1 }}>
                  {search ? 'No pages match your search' : 'No pages yet'}
                </Typography>
                {!search && (
                  <Button
                    variant="contained" startIcon={<AddIcon />} onClick={() => openEditor()}
                    sx={{ mt: 1, bgcolor: accent, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: accent } }}
                  >
                    Create Page
                  </Button>
                )}
              </Box>
            ) : (
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <Grid container spacing={2}>
                  {filteredPages.map(p => (
                    <Grid key={p.id} item xs={12} sm={6} md={4} lg={3}>
                      <Card
                        onClick={() => openPage(p)}
                        sx={{
                          bgcolor: 'background.paper',
                          border: `1px solid ${borderColor}`,
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'border-color .15s, box-shadow .15s',
                          '&:hover': {
                            borderColor: accent,
                            boxShadow: `0 0 0 1px ${accent}40`,
                          },
                        }}
                      >
                        <CardContent sx={{ pb: '12px !important' }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.75 }}>
                            {p.is_pinned && <PushPinIcon sx={{ fontSize: '.8rem', color: accent, mt: '3px', flexShrink: 0 }} />}
                            <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: '.95rem', lineHeight: 1.3 }}>
                              {p.title}
                            </Typography>
                          </Box>
                          {p.summary && (
                            <Typography sx={{
                              color: 'text.secondary', fontSize: '.78rem', lineHeight: 1.35, mb: 0.75,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            }}>
                              {p.summary}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                            {p.categories.slice(0, 3).map(c => (
                              <Chip key={c.id} label={c.name} size="small"
                                sx={{ bgcolor: `${c.color}20`, color: c.color, fontSize: '.65rem', height: 18, '& .MuiChip-label': { px: 0.75 } }} />
                            ))}
                          </Box>
                          <Typography sx={{ color: 'text.secondary', fontSize: '.68rem' }}>
                            {p.updated_by_name && `${p.updated_by_name} · `}
                            {new Date(p.updated_at).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        )}

        {/* ── Editor ─────────────────────────────────────────────────── */}
        {(creating || editing) && (
          <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            bgcolor: 'background.paper', border: `1px solid ${borderColor}`, borderRadius: 2,
          }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2.5, py: 1.5, borderBottom: `1px solid ${borderColor}`,
            }}>
              <Typography sx={{ color: 'text.primary', fontWeight: 700 }}>
                {creating ? 'New Page' : `Editing: ${selectedPage?.title}`}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined"
                  onClick={() => { setCreating(false); setEditing(false); }}
                  sx={{ borderColor: 'divider', color: 'text.secondary', textTransform: 'none' }}>
                  Cancel
                </Button>
                <Button size="small" variant="contained" onClick={save}
                  sx={{ bgcolor: accent, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: accent } }}>
                  Save
                </Button>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Title"   value={editTitle}   onChange={e => setEditTitle(e.target.value)}   fullWidth size="small" sx={fieldSx} />
              <TextField label="Summary" value={editSummary} onChange={e => setEditSummary(e.target.value)} fullWidth size="small" multiline rows={2} sx={fieldSx} />
              <TextField
                label="Content (Markdown)" value={editContent}
                onChange={e => setEditContent(e.target.value)}
                fullWidth multiline rows={14}
                sx={{ ...fieldSx, '& .MuiInputBase-input': { color: 'text.primary', fontFamily: 'monospace', fontSize: '.85rem' } }}
              />
              <TextField label="Tags (comma separated)" value={editTags} onChange={e => setEditTags(e.target.value)} fullWidth size="small" sx={fieldSx} />
              {categories.length > 0 && (
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ color: 'text.secondary' }}>Categories</InputLabel>
                  <Select
                    multiple value={editCatIds}
                    onChange={e => setEditCatIds(e.target.value as string[])}
                    renderValue={selected => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map(id => {
                          const cat = categories.find(c => c.id === id);
                          return cat ? <Chip key={id} label={cat.name} size="small" sx={{ height: 20 }} /> : null;
                        })}
                      </Box>
                    )}
                    label="Categories"
                    sx={{ color: 'text.primary', '& fieldset': { borderColor: 'divider' } }}
                  >
                    {categories.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={editPinned} onChange={e => setEditPinned(e.target.checked)} size="small" />}
                  label={<Typography sx={{ fontSize: '.85rem', color: 'text.secondary' }}>Pinned</Typography>}
                />
                <TextField label="Version note" value={editNote} onChange={e => setEditNote(e.target.value)} size="small" sx={{ flex: 1, ...fieldSx }} />
              </Box>
            </Box>
          </Box>
        )}

        {/* ── Page viewer ────────────────────────────────────────────── */}
        {selectedPage && !creating && !editing && !showVersions && (
          <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            bgcolor: 'background.paper', border: `1px solid ${borderColor}`, borderRadius: 2,
          }}>
            <Box sx={{
              px: 2.5, py: 1.5, borderBottom: `1px solid ${borderColor}`,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
            }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {selectedPage.is_pinned && <PushPinIcon sx={{ color: accent, fontSize: '.9rem' }} />}
                  <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: '1.3rem' }}>
                    {selectedPage.title}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {selectedPage.categories.map(c => (
                    <Chip key={c.id} label={c.name} size="small"
                      sx={{ bgcolor: `${c.color}20`, color: c.color, fontSize: '.72rem', height: 20 }} />
                  ))}
                  {selectedPage.tags.map(t => (
                    <Chip key={t} label={`#${t}`} size="small"
                      sx={{ bgcolor: `${accent}12`, color: accent, fontSize: '.72rem', height: 20 }} />
                  ))}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                    <VisibilityIcon sx={{ fontSize: '.8rem', color: 'text.secondary' }} />
                    <Typography sx={{ color: 'text.secondary', fontSize: '.75rem' }}>{selectedPage.view_count} views</Typography>
                  </Box>
                </Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '.72rem', mt: 0.5 }}>
                  Created by {selectedPage.created_by_name} · Updated by {selectedPage.updated_by_name} · {new Date(selectedPage.updated_at).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" startIcon={<HistoryEduIcon />} onClick={() => loadVersions(selectedPage.id)}
                  sx={{ color: 'text.secondary', textTransform: 'none', '&:hover': { color: accent } }}>History</Button>
                <Button size="small" startIcon={<EditIcon />} onClick={() => openEditor(selectedPage)}
                  sx={{ color: 'text.secondary', textTransform: 'none', '&:hover': { color: accent } }}>Edit</Button>
                <IconButton size="small" onClick={() => deletePage(selectedPage.id)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                  <DeleteIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
                <Button size="small" onClick={() => setSelectedPage(null)}
                  sx={{ color: 'text.secondary', textTransform: 'none' }}>← Back</Button>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
              {selectedPage.summary && (
                <Alert severity="info" sx={{ mb: 2, fontSize: '.85rem', bgcolor: `${accent}10`, color: 'text.primary', '& .MuiAlert-icon': { color: accent } }}>
                  {selectedPage.summary}
                </Alert>
              )}
              {selectedPage.content ? (
                <Box component="pre" sx={{
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: '"IBM Plex Mono", monospace', fontSize: '.87rem',
                  color: 'text.primary', lineHeight: 1.75, m: 0,
                }}>
                  {selectedPage.content}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography sx={{ color: 'text.secondary' }}>No content yet.</Typography>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => openEditor(selectedPage)}
                    sx={{ color: accent, mt: 1, textTransform: 'none' }}>Add content</Button>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* ── Version history ────────────────────────────────────────── */}
        {selectedPage && showVersions && (
          <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            bgcolor: 'background.paper', border: `1px solid ${borderColor}`, borderRadius: 2,
          }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2.5, py: 1.5, borderBottom: `1px solid ${borderColor}`,
            }}>
              <Typography sx={{ color: 'text.primary', fontWeight: 700 }}>Version History — {selectedPage.title}</Typography>
              <Button size="small" onClick={() => setShowVersions(false)} sx={{ color: 'text.secondary', textTransform: 'none' }}>
                Back to Page
              </Button>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {versions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography sx={{ color: 'text.secondary' }}>No version history for this page yet.</Typography>
                </Box>
              ) : (
                versions.map((v, i) => (
                  <Box key={v.id} sx={{
                    px: 2.5, py: 1.75, borderBottom: `1px solid ${borderColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    '&:hover': { bgcolor: `${accent}06` },
                  }}>
                    <Box>
                      <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: '.9rem' }}>
                        {i === 0 ? '(most recent save)' : v.version_note || v.title}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '.75rem' }}>
                        {v.edited_by_name} · {new Date(v.edited_at).toLocaleString()}
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => restoreVersion(v.id)}
                      sx={{ borderColor: 'divider', color: 'text.secondary', textTransform: 'none', '&:hover': { borderColor: accent, color: accent } }}>
                      Restore
                    </Button>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}
      </Box>

      </Box>{/* closes body flex row */}

      {/* ── Category create dialog ─────────────────────────────────────────── */}
      <Dialog open={catDialog} onClose={() => setCatDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 2, border: `1px solid ${borderColor}` } }}>
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>New Category</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Name"        value={catName} onChange={e => setCatName(e.target.value)} fullWidth size="small" sx={fieldSx} />
          <TextField label="Description" value={catDesc} onChange={e => setCatDesc(e.target.value)} fullWidth size="small" multiline rows={2} sx={fieldSx} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '.85rem' }}>Color:</Typography>
            <input type="color" value={catColor} onChange={e => setCatColor(e.target.value)}
              style={{ width: 36, height: 36, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
            <Box sx={{ width: 18, height: 18, bgcolor: catColor, borderRadius: '50%', flexShrink: 0 }} />
            <Typography sx={{ color: 'text.primary', fontSize: '.85rem' }}>{catColor}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCatDialog(false)} sx={{ color: 'text.secondary', textTransform: 'none' }}>Cancel</Button>
          <Button onClick={createCategory} variant="contained" disabled={!catName.trim()}
            sx={{ bgcolor: accent, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: accent } }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
};

export default EnterpriseWikiModule;
