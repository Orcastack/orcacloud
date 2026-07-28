import React from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Collapse,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { ExpandLess, ExpandMore, Menu as MenuIcon } from '@mui/icons-material';
import * as MuiIcons from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
// Icons are resolved via the MuiIcons mapping below to allow fallbacks and
// to support different icon exports across MUI versions. No direct imports
// here to avoid redeclaration when the code defines local icon aliases.

interface Props {
  children: React.ReactNode;
  enterpriseId?: string;
}

const EnterpriseLayout: React.FC<Props> = ({ children, enterpriseId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const id = enterpriseId ?? params.id ?? 'enterprise';

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [workspaceOpen, setWorkspaceOpen] = React.useState(true);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Icon aliases (fall back to HelpOutline when specific export isn't available)
  const DashboardIcon = MuiIcons['Dashboard'] ?? MuiIcons['HelpOutline'];
  const PeopleIcon = MuiIcons['People'] ?? MuiIcons['Groups'] ?? MuiIcons['HelpOutline'];
  const StorageIcon = MuiIcons['Storage'] ?? MuiIcons['Cloud'] ?? MuiIcons['HelpOutline'];
  const AnalyticsIcon = MuiIcons['Analytics'] ?? MuiIcons['BarChart'] ?? MuiIcons['HelpOutline'];
  const StorefrontIcon = MuiIcons['Storefront'] ?? MuiIcons['Store'] ?? MuiIcons['HelpOutline'];
  const SettingsIcon = MuiIcons['Settings'] ?? MuiIcons['Tune'] ?? MuiIcons['HelpOutline'];
  const GroupIcon = MuiIcons['Group'] ?? MuiIcons['Groups'] ?? MuiIcons['HelpOutline'];

  const items = [
    { text: 'Overview', icon: <DashboardIcon />, path: `/enterprise/${id}/overview` },
    { text: 'Users', icon: <PeopleIcon />, path: `/enterprise/${id}/users` },
    // Workspace will render here (so it appears above Data)
    { text: 'Data', icon: <StorageIcon />, path: `/enterprise/${id}/data` },
    { text: 'AI Analytics', icon: <AnalyticsIcon />, path: `/enterprise/${id}/ai-analytics` },
    { text: 'Cloud Migration', icon: <StorefrontIcon />, path: `/enterprise/${id}/cloud-migration` },
    { text: 'Security', icon: <SettingsIcon />, path: `/enterprise/${id}/security` },
    { text: 'Help & Support', icon: <PeopleIcon />, path: `/enterprise/${id}/help` },
    { text: 'Settings', icon: <SettingsIcon />, path: `/enterprise/${id}/settings` },
  ];

  const workspaceItems = [
    { text: 'Teams', icon: <GroupIcon />, path: `/enterprise/${id}/teams` },
    { text: 'Groups', icon: <PeopleIcon />, path: `/enterprise/${id}/groups` },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)',
        width: 260,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #e2e8f0',
          background: 'rgba(255, 255, 255, 0.7)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: '#153d75' }}>{enterpriseId?.slice(-2)}</Avatar>
          <Box>
            <Typography fontWeight={700}>Enterprise</Typography>
            <Typography variant="caption" color="text.secondary">{enterpriseId}</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List>
          {items.slice(0, 2).map((it) => (
            <ListItemButton key={it.text} onClick={() => handleNavigation(it.path)}>
              <ListItemIcon>{it.icon}</ListItemIcon>
              <ListItemText primary={it.text} />
            </ListItemButton>
          ))}

          {/* Workspace block placed here so it appears above Data */}
          <ListItemButton onClick={() => setWorkspaceOpen(s => !s)}>
            <ListItemIcon><GroupIcon /></ListItemIcon>
            <ListItemText primary="Workspace" />
            {workspaceOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={workspaceOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {workspaceItems.map((it) => (
                <ListItemButton key={it.text} sx={{ pl: 4 }} onClick={() => handleNavigation(it.path)}>
                  <ListItemIcon>{it.icon}</ListItemIcon>
                  <ListItemText primary={it.text} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>

          {items.slice(2).map((it) => (
            <ListItemButton key={it.text} onClick={() => handleNavigation(it.path)}>
              <ListItemIcon>{it.icon}</ListItemIcon>
              <ListItemText primary={it.text} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          display: { xs: 'block', lg: 'none' },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #e2e8f0',
          color: '#f4f4f4',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Enterprise Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer - Desktop */}
      <Box
        component="nav"
        sx={{ width: { lg: 260 }, flexShrink: { lg: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 260,
              border: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 260,
              border: 'none',
              borderRight: '1px solid #e2e8f0',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - 260px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile top spacing */}
        <Toolbar sx={{ display: { xs: 'block', lg: 'none' } }} />

        {/* Content */}
        <Box
          sx={{
            flexGrow: 1,
            width: '100%',
            overflow: 'auto',
            margin: 0,
            padding: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default EnterpriseLayout;
