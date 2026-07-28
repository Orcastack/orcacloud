import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import './styles.css';

const ACCOUNT_APP_URL = process.env.REACT_APP_ACCOUNT_URL || 'https://account.orcacloud.com';

function DomainDashboard() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f8fb', py: 6 }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 'none', border: '1px solid #d9e0e8' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Domain Dashboard</Typography>
          <Typography sx={{ mt: 1, color: '#526173' }}>
            Domain registration, DNS, configuration, billing, and renewal services are served by this container.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

function RequireAccountSession() {
  return <DomainDashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<RequireAccountSession />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode><App /></React.StrictMode>,
);
