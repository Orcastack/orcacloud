import React, { useState } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { Button, Input, Card } from './index';

/**
 * Example usage of the OrcaCloud Design System components
 * This demonstrates all three layers: tokens, rules, and patterns
 */
export const DesignSystemExample: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
  });

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = () => {
    alert('Form submitted!');
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        OrcaCloud Design System Demo
      </Typography>

      <Typography variant="body1" sx={{ mb: 4 }}>
        This demonstrates the complete component library with Buttons, Inputs, and Cards
        following IBM Carbon principles and OrcaCloud branding.
      </Typography>

      {/* Button Examples */}
      <Card variant="content" title="Button Variants" sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Button Hierarchy</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3 }}>
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="ghost">Ghost Action</Button>
          <Button variant="danger">Danger Action</Button>
        </Stack>

        <Typography variant="h6" gutterBottom>Button States</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="secondary" fullWidth>Full Width</Button>
        </Stack>
      </Card>

      {/* Input Examples */}
      <Card variant="form" title="Input States" subtitle="Form inputs with different states" sx={{ mb: 4 }}>
        <Stack spacing={3}>
          <Input
            label="Project Name"
            placeholder="Enter project name"
            helperText="Choose a unique name for your project"
            value={formData.name}
            onChange={handleInputChange('name')}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            error={!formData.email.includes('@')}
            helperText={!formData.email.includes('@') ? "Please enter a valid email" : "We'll never share your email"}
            value={formData.email}
            onChange={handleInputChange('email')}
          />

          <Input
            label="Description"
            placeholder="Enter project description"
            multiline
            rows={4}
            fullWidth
            value={formData.description}
            onChange={handleInputChange('description')}
          />

          <Input
            label="System Field"
            value="Auto-generated value"
            disabled
            helperText="This field is automatically populated"
          />
        </Stack>
      </Card>

      {/* Card Examples */}
      <Stack spacing={3}>
        <Card
          variant="dashboard"
          title="Active Projects"
          subtitle="42 projects currently running"
        >
          <Typography variant="h3" color="primary">42</Typography>
        </Card>

        <Card
          variant="content"
          title="Getting Started"
        >
          <Typography paragraph>
            Welcome to OrcaCloud platform. Get started by creating your first project
            and deploying your applications with confidence.
          </Typography>

          <Typography variant="h6" gutterBottom>Quick Start Steps:</Typography>
          <ul>
            <li>Create a new project</li>
            <li>Invite team members</li>
            <li>Deploy your first application</li>
            <li>Monitor performance metrics</li>
          </ul>
        </Card>

        <Card
          variant="form"
          title="Create New Project"
          subtitle="Fill out the details below to get started"
          actions={
            <Stack direction="row" spacing={2}>
              <Button variant="secondary">Cancel</Button>
              <Button variant="primary" onClick={handleSubmit}>Create Project</Button>
            </Stack>
          }
        >
          <Stack spacing={3}>
            <Input
              label="Project Name"
              placeholder="My Awesome Project"
              required
            />
            <Input
              label="Description"
              placeholder="Brief description of your project"
              multiline
              rows={3}
            />
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
};

export default DesignSystemExample;
