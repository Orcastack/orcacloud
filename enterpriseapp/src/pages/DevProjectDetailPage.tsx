import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';
import { getProject, type BackendProject } from '../services/projectsApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

const DevProjectDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id || id === 'undefined') {
        setError('Project id is missing.');
        setLoading(false);
        return;
      }
      if (id === 'new' || id === 'create') {
        navigate('/developer/Dashboard/projects/create', { replace: true });
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await getProject(id);
        if (!mounted) return;
        setProject(result);
      } catch {
        if (!mounted) return;
        setError('Unable to load project from backend.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/developer/Dashboard/projects')}
          sx={{ textTransform: 'none', color: t.textSecondary }}
        >
          Back to Projects
        </Button>
        <Chip
          label="Server-backed"
          size="small"
          sx={{ bgcolor: 'rgba(34,197,94,.12)', color: dashboardSemanticColors.success, fontWeight: 700 }}
        />
      </Stack>

      {loading ? (
        <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none' }}>
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} sx={{ color: dashboardTokens.colors.brandPrimary, mb: 1.2 }} />
            <Typography sx={{ color: t.textSecondary }}>Loading project…</Typography>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert severity="error" sx={{ border: `1px solid rgba(239,68,68,.4)` }}>{error}</Alert>
      ) : !project ? (
        <Alert severity="warning" sx={{ border: `1px solid rgba(245,158,11,.4)` }}>Project not found.</Alert>
      ) : (
        <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none', borderRadius: '10px' }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: t.textPrimary, fontFamily: FONT }}>
              {project.name}
            </Typography>
            <Typography sx={{ color: t.textSecondary, mt: 0.6, mb: 2, fontFamily: FONT }}>
              {project.description || 'No description'}
            </Typography>

            <Divider sx={{ borderColor: t.border, mb: 2 }} />

            <Stack spacing={1}>
              <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>
                <strong style={{ color: t.textPrimary }}>Project ID:</strong> {project.id}
              </Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>
                <strong style={{ color: t.textPrimary }}>Created At:</strong> {project.created_at || '—'}
              </Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: '.82rem' }}>
                <strong style={{ color: t.textPrimary }}>Updated At:</strong> {project.updated_at || '—'}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DevProjectDetailPage;
