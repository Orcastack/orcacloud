import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  LinearProgress,
  Alert,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Computer as ComputeIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  AccountBalance as BillingIcon,
  Help as HelpIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Button as DSButton } from '../design-system/Button';
import { Card as DSCard } from '../design-system/Card';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`grounding-tabpanel-${index}`}
      aria-labelledby={`grounding-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ResourceSummary {
  type: string;
  count: number;
  status: 'healthy' | 'warning' | 'error';
  icon: React.ReactNode;
}

interface GroundingLayerProps {
  onComplete: () => void;
}

export const GroundingLayer: React.FC<GroundingLayerProps> = ({ onComplete: _onComplete }) => {
  const navigate = useNavigate();
  const { state: _state, actions: _actions } = useOnboarding();
  const [activeTab, setActiveTab] = useState(0);

  const resourceSummary: ResourceSummary[] = [
    {
      type: 'Instances',
      count: 1,
      status: 'healthy',
      icon: <ComputeIcon />,
    },
    {
      type: 'Volumes',
      count: 0,
      status: 'healthy',
      icon: <StorageIcon />,
    },
    {
      type: 'Networks',
      count: 1,
      status: 'healthy',
      icon: <NetworkIcon />,
    },
    {
      type: 'Security Groups',
      count: 1,
      status: 'healthy',
      icon: <SecurityIcon />,
    },
  ];

  const quickActions = [
    {
      title: 'Create Instance',
      description: 'Launch a new virtual machine',
      icon: <ComputeIcon />,
      route: '/developer/compute/instances/create',
      color: 'primary',
    },
    {
      title: 'Add Storage',
      description: 'Create additional volumes',
      icon: <StorageIcon />,
      route: '/developer/storage/volumes/create',
      color: 'secondary',
    },
    {
      title: 'Configure Network',
      description: 'Set up private networks',
      icon: <NetworkIcon />,
      route: '/developer/networking/networks/create',
      color: 'info',
    },
    {
      title: 'Manage Access',
      description: 'Configure IAM and security',
      icon: <SecurityIcon />,
      route: '/developer/iam/users',
      color: 'warning',
    },
  ];

  const recentActivity = [
    {
      action: 'Instance launched',
      resource: 'web-server-01',
      time: '2 minutes ago',
      status: 'success',
    },
    {
      action: 'SSH key added',
      resource: 'my-ssh-key',
      time: '5 minutes ago',
      status: 'success',
    },
    {
      action: 'Project created',
      resource: 'my-first-project',
      time: '10 minutes ago',
      status: 'success',
    },
  ];

  const alerts = [
    {
      type: 'info',
      title: 'Welcome to OrcaCloud!',
      message: 'Your first instance is running. Check the compute tab for details.',
      time: 'Just now',
    },
    {
      type: 'warning',
      title: 'Security Recommendation',
      message: 'Consider creating additional security groups for better isolation.',
      time: '2 minutes ago',
    },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Your OrcaCloud Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your infrastructure is ready. Here's everything you need to know to get started.
        </Typography>
      </Box>

      {/* Resource Overview */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {resourceSummary.map((resource) => (
          <Box key={resource.type} sx={{ flex: '1 1 300px', maxWidth: '100%' }}>
            <DSCard variant="dashboard">
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: `${getStatusColor(resource.status)}.light` }}>
                  {resource.icon}
                </Avatar>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {resource.count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {resource.type}
                </Typography>
                <Chip
                  size="small"
                  label={resource.status}
                  color={getStatusColor(resource.status)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </DSCard>
          </Box>
        ))}
      </Box>

      {/* Quick Actions */}
      <DSCard variant="dashboard" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {quickActions.map((action) => (
              <Box key={action.title} sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '200px' }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(action.route)}
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    height: 'auto',
                    textTransform: 'none',
                  }}
                >
                  <Avatar sx={{ bgcolor: `${action.color}.light` }}>
                    {action.icon}
                  </Avatar>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {action.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Button>
              </Box>
            ))}
          </Box>
        </CardContent>
      </DSCard>

      {/* Main Content Tabs */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 'medium',
              },
            }}
          >
            <Tab
              icon={<ComputeIcon />}
              label="Compute"
              iconPosition="start"
            />
            <Tab
              icon={<StorageIcon />}
              label="Storage"
              iconPosition="start"
            />
            <Tab
              icon={<NetworkIcon />}
              label="Network"
              iconPosition="start"
            />
            <Tab
              icon={<SecurityIcon />}
              label="Security & IAM"
              iconPosition="start"
            />
            <Tab
              icon={<BillingIcon />}
              label="Billing"
              iconPosition="start"
            />
          </Tabs>

          {/* Compute Tab */}
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h6" gutterBottom>
              Your Instances
            </Typography>
            <DSCard variant="dashboard">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    web-server-01
                  </Typography>
                  <Chip label="Running" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '150px' }}>
                    <Typography variant="body2" color="text.secondary">Type</Typography>
                    <Typography variant="body1">t2.micro</Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '150px' }}>
                    <Typography variant="body2" color="text.secondary">Region</Typography>
                    <Typography variant="body1">US East (N. Virginia)</Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '150px' }}>
                    <Typography variant="body2" color="text.secondary">IP Address</Typography>
                    <Typography variant="body1">10.0.0.1</Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <DSButton variant="secondary" size="small">
                    Connect via SSH
                  </DSButton>
                  <Button variant="outlined" size="small">
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </DSCard>
          </TabPanel>

          {/* Storage Tab */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom>
              Storage Resources
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              You haven't created any volumes yet. Volumes provide persistent storage for your instances.
            </Alert>
            <DSButton variant="primary" onClick={() => navigate('/developer/storage/volumes/create')}>
              Create Your First Volume
            </DSButton>
          </TabPanel>

          {/* Network Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Network Configuration
            </Typography>
            <DSCard variant="dashboard">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  Default Network
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Your instance is connected to the default network with basic connectivity.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Subnet</Typography>
                  <Typography variant="body1">10.0.0.0/24</Typography>
                </Box>
              </CardContent>
            </DSCard>
          </TabPanel>

          {/* Security & IAM Tab */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Security & Identity
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                <DSCard variant="dashboard">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      SSH Keys
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="my-ssh-key" secondary="Added 5 minutes ago" />
                      </ListItem>
                    </List>
                  </CardContent>
                </DSCard>
              </Box>
              <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                <DSCard variant="dashboard">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Security Groups
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="default" secondary="SSH, HTTP, HTTPS allowed" />
                      </ListItem>
                    </List>
                  </CardContent>
                </DSCard>
              </Box>
            </Box>
          </TabPanel>

          {/* Billing Tab */}
          <TabPanel value={activeTab} index={4}>
            <Typography variant="h6" gutterBottom>
              Cost Overview
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                <DSCard variant="dashboard">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Current Usage
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TrendingUpIcon color="primary" />
                      <Typography variant="h6">$0.012/hour</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      t2.micro instance running for 2 minutes
                    </Typography>
                  </CardContent>
                </DSCard>
              </Box>
              <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                <DSCard variant="dashboard">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Free Tier Status
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      750 hours remaining this month
                    </Typography>
                    <LinearProgress variant="determinate" value={10} sx={{ mt: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      10% of free tier used
                    </Typography>
                  </CardContent>
                </DSCard>
              </Box>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Recent Activity & Alerts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
        <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
          <DSCard variant="dashboard">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                {recentActivity.map((activity, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getStatusIcon(activity.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.action}
                      secondary={`${activity.resource} • ${activity.time}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </DSCard>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
          <DSCard variant="dashboard">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              {alerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.type as any}
                  sx={{ mb: 2 }}
                  action={
                    <IconButton size="small" color="inherit">
                      <HelpIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Typography variant="subtitle2" fontWeight="medium">
                    {alert.title}
                  </Typography>
                  <Typography variant="body2">
                    {alert.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.time}
                  </Typography>
                </Alert>
              ))}
            </CardContent>
          </DSCard>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate('/developer/docs')}>
          View Documentation
        </Button>
        <DSButton variant="primary" onClick={() => navigate('/developer/dashboard')}>
          Go to Full Dashboard
        </DSButton>
      </Box>
    </Box>
  );
};

export default GroundingLayer;
