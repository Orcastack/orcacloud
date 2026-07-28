import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Box } from '@mui/material';
import './styles/professional.css';
import './styles/orcacloud-carbon.css';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { initializeOpenTelemetry } from './observability/telemetry';
import { TelemetryErrorBoundary } from './observability/hooks';
import CloudPlatformHeader from './components/Layout/CloudPlatformHeader';
import Footer from './components/Layout/Footer';
import Homepage from './pages/Homepage';
import FeaturesPage from './pages/FeaturesPage';
import DocsPage from './pages/DocsPage';
import AboutPage from './pages/AboutPage';
import ContactSalesPage from './pages/ContactSalesPage';
import SupportPage from './pages/SupportPage';
import DeveloperPage from './pages/DeveloperPage';
import ResourcesPage from './pages/ResourcesPage';
import BareMetalVpsPage from './pages/BareMetalVpsPage';
import DomainsLandingPage from './pages/DomainsLandingPage';
import PortalEntryPage from './pages/PortalEntryPage';
const ACCOUNT_APP_URL = process.env.REACT_APP_ACCOUNT_URL || 'https://account.orcacloud.com';

const StaticSiteRoutes: React.FC = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <CloudPlatformHeader />
    <Box component="main" sx={{ flex: 1 }}>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/portal" element={<PortalEntryPage />} />
        <Route path="/login" element={<NavigateToAccountApp />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/bare-metal-vps/:slug" element={<BareMetalVpsPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/domains" element={<DomainsLandingPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/contact" element={<ContactSalesPage />} />
        <Route path="*" element={<Homepage />} />
      </Routes>
    </Box>
    <Footer />
  </Box>
);

const NavigateToAccountApp: React.FC = () => {
  if (typeof window !== 'undefined') {
    window.location.replace(`${ACCOUNT_APP_URL}/login${window.location.search}`);
  }
  return null;
};

function getRouterBasename(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return '/';
  }
  return process.env.PUBLIC_URL || '/';
}

const StaticSiteApp: React.FC = () => {
  useEffect(() => {
    initializeOpenTelemetry();
  }, []);

  return (
    <TelemetryErrorBoundary componentName="StaticSiteApp">
      <Router basename={getRouterBasename()}>
        <CustomThemeProvider>
          <AuthProvider>
            <StaticSiteRoutes />
          </AuthProvider>
        </CustomThemeProvider>
      </Router>
    </TelemetryErrorBoundary>
  );
};

export default StaticSiteApp;
