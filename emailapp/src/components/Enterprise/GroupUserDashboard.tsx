import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, TextField, Button } from '@mui/material';
import { listGroups, createGroup, Group } from '../../services/groupsApi';

const GroupUserDashboard: React.FC = () => {
	const [groups, setGroups] = React.useState<Group[]>([]);
	const [name, setName] = React.useState('');

	React.useEffect(() => {
		let mounted = true;
		listGroups().then(r => { if (mounted) setGroups(r || []); });
		return () => { mounted = false; };
	}, []);

	const create = async () => {
		const handle = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
		const g = await createGroup({ name, handle, visibility: 'private', group_type: 'developer' });
		setGroups(s => [...s, g]);
		setName('');
	};

	return (
		<Box>
			<Typography variant="h5">Groups</Typography>
			<Paper sx={{ mt: 2, p: 2 }}>
				<List>
					{groups.map(g => (
						<ListItem key={g.id}><ListItemText primary={g.name || `Group ${g.id}`} /></ListItem>
					))}
				</List>
				<Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
					<TextField size="small" value={name} onChange={(e) => setName(e.target.value)} placeholder="New group name" />
					<Button variant="contained" onClick={create}>Create</Button>
				</Box>
			</Paper>
		</Box>
		);
};

export default GroupUserDashboard;
