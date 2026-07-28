// OrcaCloud Wiki Page
// Full-screen standalone wiki — route: /enterprise/:orgSlug/wiki

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import EnterpriseWikiModule from '../components/Enterprise/EnterpriseWikiModule';
import { organizationApi } from '../services/enterpriseApi';

const WikiPage: React.FC = () => {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const [orgId,   setOrgId]   = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!orgSlug) { navigate('/'); return; }
    organizationApi.getBySlug(orgSlug)
      .then(org => { setOrgId(org.id); setOrgName(org.name); })
      .catch(() => setError(true));
  }, [orgSlug, navigate]);

  if (error) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="error">Organization not found.</Typography>
      </Box>
    );
  }

  if (!orgId) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return <EnterpriseWikiModule orgId={orgId} orgSlug={orgSlug} orgName={orgName} />;
};

export default WikiPage;
