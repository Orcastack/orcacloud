import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { dashboardTokens, dashboardSemanticColors } from '../../styles/dashboardDesignSystem';
import { listProjects, listProjectRepos, getRepoBranches, type BackendProject, type BackendRepository } from '../../services/projectsApi';
import { listDefinitions, triggerDefinition, type PipelineDefinition } from '../../services/pipelinesApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  github: <GitHubIcon sx={{ fontSize: '1.2rem' }} />,
  gitlab: <Box component="span" sx={{ fontWeight: 900, fontSize: '1rem', color: '#fc6d26' }}>GL</Box>,
  bitbucket: <Box component="span" sx={{ fontWeight: 900, fontSize: '1rem', color: '#0052cc' }}>BB</Box>,
};

interface RunPipelineModalProps {
  open: boolean;
  onClose: () => void;
  onPipelineStarted: (pipelineId: string) => void;
}

type Step = 'project' | 'repo' | 'pipeline' | 'branch' | 'confirm';

const RunPipelineModal: React.FC<RunPipelineModalProps> = ({ open, onClose, onPipelineStarted }) => {
  const [step, setStep] = useState<Step>('project');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Selection state
  const [selectedProject, setSelectedProject] = useState<BackendProject | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<BackendRepository | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineDefinition | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  // Data state
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [repos, setRepos] = useState<BackendRepository[]>([]);
  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([]);
  const [branches, setBranches] = useState<string[]>([]);

  const reset = useCallback(() => {
    setStep('project');
    setSelectedProject(null);
    setSelectedRepo(null);
    setSelectedPipeline(null);
    setSelectedBranch('');
    setSearch('');
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const loadRepos = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const data = await listProjectRepos(projectId);
      setRepos(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const loadPipelines = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const data = await listDefinitions({ project: projectId });
      setPipelines(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async (repoId: string) => {
    setLoading(true);
    try {
      const data = await getRepoBranches(repoId);
      const names = data.map((b: any) => b.name ?? b);
      setBranches(names);
      setSelectedBranch(names[0] ?? '');
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      loadProjects();
    }
  }, [open, reset, loadProjects]);

  const handleProjectSelect = (project: BackendProject) => {
    setSelectedProject(project);
    setStep('repo');
    loadRepos(project.id);
  };

  const handleRepoSelect = (repo: BackendRepository) => {
    setSelectedRepo(repo);
    setStep('pipeline');
    loadPipelines(selectedProject!.id);
  };

  const handlePipelineSelect = (pipeline: PipelineDefinition) => {
    setSelectedPipeline(pipeline);
    setStep('branch');
    loadBranches(selectedRepo!.id);
  };

  const handleRun = async () => {
    if (!selectedPipeline) return;
    setLoading(true);
    try {
      const run = await triggerDefinition(selectedPipeline.id, {
        branch: selectedBranch,
        repo:   selectedRepo?.id ?? null,
      });
      onPipelineStarted(run.id);
      onClose();
    } catch { /* silent — caller handles feedback */ } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const renderStepContent = () => {
    switch (step) {
      case 'project':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: FONT, fontWeight: 600 }}>
              Select Project
            </Typography>
            <TextField
              fullWidth
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ mb: 2 }}
            />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                {filteredProjects.map((project) => (
                  <ListItem key={project.id} disablePadding>
                    <ListItemButton onClick={() => handleProjectSelect(project)}>
                      <ListItemText
                        primary={project.name}
                        secondary={project.description}
                      />
                      <ArrowForwardIcon sx={{ color: t.textSecondary }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        );

      case 'repo':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: FONT, fontWeight: 600 }}>
              Select Repository
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                {repos.map((repo) => (
                  <ListItem key={repo.id} disablePadding>
                    <ListItemButton onClick={() => handleRepoSelect(repo)}>
                      <ListItemIcon>
                        {PROVIDER_ICON[repo.provider ?? 'other'] ?? <GitHubIcon sx={{ fontSize: '1.2rem' }} />}
                      </ListItemIcon>
                      <ListItemText
                        primary={repo.repo_name ?? repo.id}
                        secondary={`Default: ${repo.default_branch ?? 'main'}`}
                      />
                      <ArrowForwardIcon sx={{ color: t.textSecondary }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        );

      case 'pipeline':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: FONT, fontWeight: 600 }}>
              Select Pipeline
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : pipelines.length === 0 ? (
              <Typography sx={{ color: t.textSecondary, fontFamily: FONT, py: 2 }}>
                No pipeline definitions found for this project. Create one first.
              </Typography>
            ) : (
              <List>
                {pipelines.map((pipeline) => (
                  <ListItem key={pipeline.id} disablePadding>
                    <ListItemButton onClick={() => handlePipelineSelect(pipeline)}>
                      <ListItemText
                        primary={pipeline.name}
                        secondary={`${pipeline.stages.length} stage(s)`}
                      />
                      <ArrowForwardIcon sx={{ color: t.textSecondary }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        );

      case 'branch':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: FONT, fontWeight: 600 }}>
              Select Branch
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                {branches.map((branch) => (
                  <ListItem key={branch} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        setSelectedBranch(branch);
                        setStep('confirm');
                      }}
                      selected={selectedBranch === branch}
                    >
                      <ListItemText primary={branch} />
                      {selectedBranch === branch && <CheckCircleIcon sx={{ color: dashboardSemanticColors.success }} />}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        );

      case 'confirm':
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: FONT, fontWeight: 600 }}>
              Confirm Pipeline Run
            </Typography>
            <Card sx={{ mb: 2, border: `1px solid ${t.border}`, bgcolor: t.surface }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: FONT, color: t.textSecondary }}>Project:</Typography>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 600 }}>{selectedProject?.name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: FONT, color: t.textSecondary }}>Repository:</Typography>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 600 }}>{selectedRepo?.repo_name ?? selectedRepo?.id}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: FONT, color: t.textSecondary }}>Pipeline:</Typography>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 600 }}>{selectedPipeline?.name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: FONT, color: t.textSecondary }}>Branch:</Typography>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 600 }}>{selectedBranch}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: FONT, color: t.textSecondary }}>Stages:</Typography>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 600 }}>{selectedPipeline?.stages.map((s: any) => s.name ?? s).join(' → ')}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
            <Button
              fullWidth
              variant="contained"
              onClick={handleRun}
              disabled={loading}
              sx={{
                bgcolor: dashboardTokens.colors.brandPrimary,
                color: '#0a0f1a',
                fontWeight: 700,
                fontSize: '.9rem',
                borderRadius: '8px',
                textTransform: 'none',
                '&:hover': { bgcolor: dashboardTokens.colors.brandPrimaryHover },
              }}
            >
              {loading ? <CircularProgress size={20} /> : 'Run Pipeline'}
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'project': return 'Run Pipeline - Select Project';
      case 'repo': return 'Run Pipeline - Select Repository';
      case 'pipeline': return 'Run Pipeline - Select Pipeline';
      case 'branch': return 'Run Pipeline - Select Branch';
      case 'confirm': return 'Run Pipeline - Confirm';
      default: return 'Run Pipeline';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          minHeight: '500px',
        },
      }}
    >
      <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {getStepTitle()}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 3 }}>
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
};

export default RunPipelineModal;
