import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Avatar,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Assessment as MonitoringIcon,
  Description as LogsIcon,
  Build as AutomationIcon,
  TrendingUp as ScalingIcon,
  Backup as BackupIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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
      id={`post-deployment-tabpanel-${index}`}
      aria-labelledby={`post-deployment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface PostDeploymentSurfaceProps {
  onComplete: () => void;
}

export const PostDeploymentSurface: React.FC<PostDeploymentSurfaceProps> = ({ onComplete: _onComplete }) => {
  const navigate = useNavigate();
  const { state: _state, actions: _actions } = useOnboarding();
  const [activeTab, setActiveTab] = useState(0);
  const [autoScalingEnabled, _setAutoScalingEnabled] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [backupEnabled, _setBackupEnabled] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const advancedFeatures = [
    {
      title: 'Monitoring & Observability',
      description: 'Real-time metrics, logs, and alerts for your infrastructure',
      icon: <MonitoringIcon />,
      status: monitoringEnabled ? 'Enabled' : 'Disabled',
      statusColor: monitoringEnabled ? 'success' : 'default',
      route: '/developer/monitoring',
    },
    {
      title: 'Auto Scaling',
      description: 'Automatically adjust resources based on demand',
      icon: <ScalingIcon />,
      status: autoScalingEnabled ? 'Enabled' : 'Disabled',
      statusColor: autoScalingEnabled ? 'success' : 'default',
      route: '/developer/compute/auto-scaling',
    },
    {
      title: 'Automated Backups',
      description: 'Scheduled backups for data protection and disaster recovery',
      icon: <BackupIcon />,
      status: backupEnabled ? 'Enabled' : 'Disabled',
      statusColor: backupEnabled ? 'success' : 'default',
      route: '/developer/storage/backups',
    },
    {
      title: 'CI/CD Pipelines',
      description: 'Automate your deployment workflows',
      icon: <AutomationIcon />,
      status: 'Not Configured',
      statusColor: 'warning',
      route: '/developer/cicd',
    },
  ];

  const monitoringMetrics = [
    { label: 'CPU Usage', value: 15, status: 'normal' },
    { label: 'Memory Usage', value: 45, status: 'normal' },
    { label: 'Network In', value: 2.1, status: 'normal', unit: 'MB/s' },
    { label: 'Network Out', value: 1.8, status: 'normal', unit: 'MB/s' },
    { label: 'Disk I/O', value: 85, status: 'warning', unit: '%' },
  ];

  const recentLogs = [
    { timestamp: '2024-01-15 14:32:15', level: 'INFO', message: 'Instance web-server-01 started successfully' },
    { timestamp: '2024-01-15 14:32:10', level: 'INFO', message: 'SSH connection established' },
    { timestamp: '2024-01-15 14:32:05', level: 'INFO', message: 'System initialization completed' },
    { timestamp: '2024-01-15 14:32:00', level: 'INFO', message: 'Network configuration applied' },
  ];

  const automationRules = [
    {
      name: 'Scale on High CPU',
      description: 'Add instances when CPU > 80% for 5 minutes',
      enabled: false,
      type: 'scaling',
    },
    {
      name: 'Daily Backup',
      description: 'Create volume snapshots every 24 hours',
      enabled: false,
      type: 'backup',
    },
    {
      name: 'Security Updates',
      description: 'Apply security patches automatically',
      enabled: true,
      type: 'maintenance',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'error';
      case 'WARN':
        return 'warning';
      case 'INFO':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Advanced Platform Features
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Now that your infrastructure is running, explore advanced features to optimize,
          secure, and automate your cloud environment.
        </Typography>
      </Box>

      {/* Feature Overview */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {advancedFeatures.map((feature) => (
          <Box key={feature.title} sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
            <DSCard variant="dashboard">
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'primary.light' }}>
                  {feature.icon}
                </Avatar>
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {feature.description}
                </Typography>
                <Chip
                  label={feature.status}
                  color={feature.statusColor as any}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <DSButton
                  variant="secondary"
                  size="small"
                  onClick={() => navigate(feature.route)}
                  fullWidth
                >
                  Configure
                </DSButton>
              </CardContent>
            </DSCard>
          </Box>
        ))}
      </Box>

      {/* Detailed Tabs */}
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
              icon={<MonitoringIcon />}
              label="Monitoring"
              iconPosition="start"
            />
            <Tab
              icon={<LogsIcon />}
              label="Logs"
              iconPosition="start"
            />
            <Tab
              icon={<AutomationIcon />}
              label="Automation"
              iconPosition="start"
            />
            <Tab
              icon={<SecurityIcon />}
              label="Security"
              iconPosition="start"
            />
          </Tabs>

          {/* Monitoring Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Real-time Metrics</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={monitoringEnabled}
                        onChange={(e) => setMonitoringEnabled(e.target.checked)}
                      />
                    }
                    label="Enable Monitoring"
                  />
                  <IconButton size="small">
                    <RefreshIcon />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {monitoringMetrics.map((metric) => (
                  <Box key={metric.label} sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: '200px' }}>
                    <DSCard variant="dashboard">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {metric.label}
                          </Typography>
                          <Chip
                            label={metric.status}
                            color={getStatusColor(metric.status)}
                            size="small"
                          />
                        </Box>
                        <Typography variant="h4" fontWeight="bold">
                          {metric.value}{metric.unit || '%'}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={metric.unit ? (metric.value / 10) : metric.value}
                          color={getStatusColor(metric.status)}
                          sx={{ mt: 1, height: 6, borderRadius: 3 }}
                        />
                      </CardContent>
                    </DSCard>
                  </Box>
                ))}
              </Box>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  💡 <strong>Pro Tip:</strong> Set up alerts for when CPU usage exceeds 80% or disk I/O is high.
                </Typography>
              </Alert>
            </Box>
          </TabPanel>

          {/* Logs Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">System Logs</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" startIcon={<RefreshIcon />}>
                    Refresh
                  </Button>
                  <Button variant="outlined" size="small">
                    Export Logs
                  </Button>
                </Box>
              </Box>

              <DSCard variant="dashboard">
                <CardContent sx={{ p: 0 }}>
                  <List>
                    {recentLogs.map((log, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ px: 3, py: 2 }}>
                          <ListItemIcon sx={{ minWidth: 100 }}>
                            <Chip
                              label={log.level}
                              color={getLogLevelColor(log.level)}
                              size="small"
                              variant="outlined"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={log.message}
                            secondary={log.timestamp}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontFamily: 'monospace',
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              fontFamily: 'monospace',
                            }}
                          />
                        </ListItem>
                        {index < recentLogs.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </DSCard>

              <Alert severity="success" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  ✅ Your instance is running smoothly. All system logs show normal operation.
                </Typography>
              </Alert>
            </Box>
          </TabPanel>

          {/* Automation Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Automation Rules</Typography>
                <DSButton variant="primary" startIcon={<AddIcon />}>
                  Add Rule
                </DSButton>
              </Box>

              <List>
                {automationRules.map((rule, index) => (
                  <ListItem key={index} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: rule.enabled ? 'success.light' : 'grey.300' }}>
                        {rule.enabled ? <PlayIcon /> : <StopIcon />}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={rule.name}
                      secondary={rule.description}
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={rule.enabled}
                        onChange={() => {/* Toggle rule */}}
                        color="primary"
                      />
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>

              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  ⚠️ <strong>Recommendation:</strong> Enable auto-scaling to handle traffic spikes automatically.
                </Typography>
              </Alert>
            </Box>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Security Posture
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                  <DSCard variant="dashboard">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Security Score
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant="h3" color="success.main" fontWeight="bold">
                          85/100
                        </Typography>
                        <Chip label="Good" color="success" size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Your security configuration is solid, but there are improvements available.
                      </Typography>
                      <LinearProgress variant="determinate" value={85} sx={{ mt: 1, '& .MuiLinearProgress-bar': { bgcolor: 'success.main' } }} />
                    </CardContent>
                  </DSCard>
                </Box>

                <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                  <DSCard variant="dashboard">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Recommendations
                      </Typography>
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <NotificationsIcon color="warning" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Enable multi-factor authentication"
                            secondary="Add an extra layer of security to your account"
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <SecurityIcon color="info" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Configure firewall rules"
                            secondary="Restrict network access to necessary ports only"
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </DSCard>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  🔒 <strong>Security Best Practice:</strong> Regularly rotate your API tokens and SSH keys.
                </Typography>
              </Alert>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate('/developer/support')}>
          Get Support
        </Button>
        <DSButton variant="primary" onClick={() => navigate('/developer/dashboard')}>
          Back to Dashboard
        </DSButton>
        <DSButton variant="secondary" onClick={() => navigate('/developer/docs/advanced')}>
          Advanced Documentation
        </DSButton>
      </Box>
    </Box>
  );
};

export default PostDeploymentSurface;
