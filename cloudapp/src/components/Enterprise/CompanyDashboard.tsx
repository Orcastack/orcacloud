import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Alert,
} from '@mui/material';
import {
  Business,
  People,
  TrendingUp,
  Security,
  Analytics,
  Settings,
  Add,
  Timeline,
  MonetizationOn,
  LocationOn,
  Domain,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface CompanyMetric {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

interface Project {
  id: number;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  progress: number;
  dueDate: string;
  team: string[];
}

const CompanyDashboard: React.FC = () => {
  const { user: _user, organization } = useAuth();
  const [metrics, setMetrics] = useState<CompanyMetric[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Mock data - in real app, this would come from API
    setMetrics([
      {
        title: 'Total Employees',
        value: '247',
        change: '+12%',
        trend: 'up',
        icon: <People sx={{ fontSize: 28 }} />,
        color: '#153d75',
      },
      {
        title: 'Active Projects',
        value: '34',
        change: '+8',
        trend: 'up',
        icon: <Timeline sx={{ fontSize: 28 }} />,
        color: '#22c55e',
      },
      {
        title: 'Revenue',
        value: '$2.4M',
        change: '+18%',
        trend: 'up',
        icon: <MonetizationOn sx={{ fontSize: 28 }} />,
        color: '#f59e0b',
      },
      {
        title: 'Security Score',
        value: '95/100',
        change: '+2',
        trend: 'up',
        icon: <Security sx={{ fontSize: 28 }} />,
        color: '#8b5cf6',
      },
    ]);

    setTeamMembers([
      {
        id: 1,
        name: 'John Doe',
        role: 'Engineering Manager',
        department: 'Engineering',
        status: 'active',
      },
      {
        id: 2,
        name: 'Sarah Chen',
        role: 'Product Manager',
        department: 'Product',
        status: 'active',
      },
      {
        id: 3,
        name: 'Mike Wilson',
        role: 'DevOps Engineer',
        department: 'Engineering',
        status: 'active',
      },
    ]);

    setProjects([
      {
        id: 1,
        name: 'Cloud Migration Initiative',
        status: 'active',
        progress: 75,
        dueDate: 'Q1 2026',
        team: ['John Doe', 'Mike Wilson'],
      },
      {
        id: 2,
        name: 'AI Implementation Program',
        status: 'active',
        progress: 60,
        dueDate: 'Q2 2026',
        team: ['Sarah Chen', 'John Doe'],
      },
      {
        id: 3,
        name: 'Security Infrastructure Upgrade',
        status: 'completed',
        progress: 100,
        dueDate: 'Completed',
        team: ['Mike Wilson'],
      },
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'planning':
        return 'info';
      case 'on_hold':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'planning':
        return 'Planning';
      case 'on_hold':
        return 'On Hold';
      default:
        return status;
    }
  };

  if (!organization?.is_registered) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6">Organization Not Registered</Typography>
          <Typography>
            Your organization needs to be registered to access the enterprise dashboard.
            Please contact your administrator or register your organization.
          </Typography>
        </Alert>
        <Button variant="contained" size="large">
          Register Organization
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3, lg: 4 }, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Business sx={{ fontSize: { xs: 32, sm: 40 }, color: '#153d75', mr: 1 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', sm: '2.125rem' },
                background: 'linear-gradient(135deg, #161616 0%, #262626 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                wordBreak: 'break-word',
              }}
            >
              {organization.name} Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Enterprise management and analytics for {organization.name}
            </Typography>
          </Box>
        </Box>

        {/* Organization Info */}
        <Paper sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
          borderRadius: { xs: 2, sm: 3 }
        }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr' },
            gap: { xs: 2, sm: 3 }
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                <Domain sx={{ fontSize: { xs: 16, sm: 18 }, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
                  Domain: {organization.domain}
                </Typography>
              </Box>
              {organization.industry && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  <Business sx={{ fontSize: { xs: 16, sm: 18 }, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
                    Industry: {organization.industry}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box>
              {organization.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  <LocationOn sx={{ fontSize: { xs: 16, sm: 18 }, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
                    Location: {organization.location}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label={`${organization.size || 'Unknown'} employees`}
                  variant="outlined"
                  size="small"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                />
                <Chip
                  label={organization.subscription_plan || 'Enterprise'}
                  color="primary"
                  size="small"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Metrics Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: { xs: 2, sm: 3 }, mb: { xs: 3, sm: 4 } }}>
        {metrics.map((metric, index) => (
          <Card
            key={index}
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: { xs: '16px', sm: '20px' },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: { xs: 'translateY(-4px)', sm: 'translateY(-8px)' },
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '1.8rem', sm: '2.5rem' },
                      background: `linear-gradient(135deg, ${metric.color} 0%, ${metric.color}99 100%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                    }}
                  >
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {metric.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {metric.trend === 'up' ? (
                      <TrendingUp sx={{ fontSize: { xs: 14, sm: 16 }, color: '#22c55e', mr: 0.5 }} />
                    ) : metric.trend === 'down' ? (
                      <TrendingUp sx={{ fontSize: { xs: 14, sm: 16 }, color: '#ef4444', mr: 0.5, transform: 'rotate(180deg)' }} />
                    ) : null}
                    <Typography
                      variant="caption"
                      sx={{
                        color: metric.trend === 'up' ? '#22c55e' : metric.trend === 'down' ? '#ef4444' : 'text.secondary',
                        fontWeight: 600,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      }}
                    >
                      {metric.change}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    width: { xs: 50, sm: 60 },
                    height: { xs: 50, sm: 60 },
                    borderRadius: { xs: '12px', sm: '16px' },
                    background: `linear-gradient(135deg, ${metric.color}20 0%, ${metric.color}10 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: metric.color,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                    {metric.icon}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Main Content Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 2, sm: 3 } }}>
        {/* Team Members */}
        <Paper
          sx={{
            borderRadius: { xs: '16px', sm: '20px' },
            border: '1px solid #e2e8f0',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            height: '100%',
          }}
        >
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                Team Members
              </Typography>
              <Button
                startIcon={<Add />}
                variant="outlined"
                size="small"
                sx={{ borderRadius: '12px', fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 0.5, sm: 1 } }}
              >
                Add Member
              </Button>
            </Box>
            <List sx={{ p: 0 }}>
              {teamMembers.map((member) => (
                <ListItem
                  key={member.id}
                  sx={{
                    borderRadius: '12px',
                    mb: 2,
                    border: '1px solid #e2e8f0',
                    '&:hover': {
                      backgroundColor: '#FFFFFF',
                    },
                    p: { xs: 1.5, sm: 2 },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={member.avatar}
                      sx={{
                        width: { xs: 40, sm: 48 },
                        height: { xs: 40, sm: 48 },
                        background: 'linear-gradient(135deg, #161616 0%, #262626 100%)',
                      }}
                    >
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={member.name}
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                          {member.role}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                          {member.department}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={member.status}
                      size="small"
                      color={member.status === 'active' ? 'success' : 'default'}
                      sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>

        {/* Active Projects */}
        <Paper
          sx={{
            borderRadius: { xs: '16px', sm: '20px' },
            border: '1px solid #e2e8f0',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            height: '100%',
          }}
        >
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                Active Projects
              </Typography>
              <Button
                startIcon={<Add />}
                variant="outlined"
                size="small"
                sx={{ borderRadius: '12px', fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 0.5, sm: 1 } }}
              >
                New Project
              </Button>
            </Box>
            <List sx={{ p: 0 }}>
              {projects.map((project) => (
                <ListItem
                  key={project.id}
                  sx={{
                    borderRadius: '12px',
                    mb: 2,
                    border: '1px solid #e2e8f0',
                    '&:hover': {
                      backgroundColor: '#FFFFFF',
                    },
                    p: { xs: 1.5, sm: 2 },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
                          {project.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(project.status)}
                          size="small"
                          color={getStatusColor(project.status) as any}
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                            Due: {project.dueDate}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                            {project.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={project.progress}
                          sx={{
                            height: { xs: 3, sm: 4 },
                            borderRadius: 2,
                            backgroundColor: '#EEEEEE',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: project.status === 'completed' ? '#22c55e' : '#153d75',
                              borderRadius: 2,
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' }, wordBreak: 'break-word' }}>
                          Team: {project.team.join(', ')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>
      </Box>

      {/* Quick Actions */}
      <Paper
        sx={{
          mt: { xs: 3, sm: 4 },
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: '16px', sm: '20px' },
          border: '1px solid #e2e8f0',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: { xs: 1.5, sm: 2 } }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Analytics />}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #161616 0%, #262626 100%)',
              color: '#f4f4f4',
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              '&:hover': {
                background: 'linear-gradient(135deg, #262626 0%, #161616 100%)',
              },
            }}
          >
            View Analytics
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<People />}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
          >
            Manage Team
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Security />}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
          >
            Security Audit
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Settings />}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
          >
            Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CompanyDashboard;
