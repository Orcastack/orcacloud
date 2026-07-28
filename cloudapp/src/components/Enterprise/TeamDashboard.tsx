import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, TextField, Button } from '@mui/material';
import { teamsApi } from '../../services/teamsApi';

const TeamDashboard: React.FC = () => {
  const [teams, setTeams] = React.useState<any[]>([]);
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    const parts = window.location.pathname.split('/');
    const id = parts.includes('enterprise') ? parts[parts.indexOf('enterprise') + 1] : 'default';
    teamsApi.list(id).then(r => { if (mounted) setTeams(r || []); });
    return () => { mounted = false; };
  }, []);

  const create = async () => {
    const parts = window.location.pathname.split('/');
    const id = parts.includes('enterprise') ? parts[parts.indexOf('enterprise') + 1] : 'default';
    const t = await teamsApi.create(id, { name });
    setTeams(s => [...s, t]);
    setName('');
  };

  return (
    <Box>
      <Typography variant="h5">Teams</Typography>
      <Paper sx={{ mt: 2, p: 2 }}>
        <List>
          {teams.map(t => (
            <ListItem key={t.id}><ListItemText primary={t.name || `Team ${t.id}`} /></ListItem>
          ))}
        </List>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField size="small" value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name" />
          <Button variant="contained" onClick={create}>Create</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default TeamDashboard;
