/**
 * MonitoringPage — thin wrapper around DevMonitoringPage.
 * Accepts an optional `defaultTab` prop (used by monitor-dashboard routes
 * for incidents / alerts / metrics / logs) so App.tsx routes compile cleanly.
 * Tab pre-selection can be wired through to DevMonitoringPage in a follow-up.
 */
import React from 'react';
import DevMonitoringPage from './DevMonitoringPage';

interface MonitoringPageProps {
  defaultTab?: number;
}

const MonitoringPage: React.FC<MonitoringPageProps> = (_props) => {
  // defaultTab forwarding can be wired into DevMonitoringPage when it
  // gains an initialTab prop; for now render the full monitoring view.
  return <DevMonitoringPage />;
};

export default MonitoringPage;
