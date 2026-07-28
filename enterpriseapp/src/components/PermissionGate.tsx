/**
 * PermissionGate
 * ──────────────
 * Renders `children` only when the `can` prop is true.
 * When false, renders the optional `fallback` (default: nothing).
 *
 * Usage:
 *   const { can } = useGroupPermissions(groupId)
 *
 *   <PermissionGate can={can('pipeline.run')}>
 *     <Button>Run Pipeline</Button>
 *   </PermissionGate>
 *
 *   <PermissionGate can={can('secret.view')} fallback={<Tooltip title="No access"><span><Button disabled>View</Button></span></Tooltip>}>
 *     <Button>View Secret</Button>
 *   </PermissionGate>
 */

import React from 'react';

interface PermissionGateProps {
  /** When true the children are rendered; when false the fallback is rendered */
  can: boolean;
  children: React.ReactNode;
  /** Optional element to render when permission is denied. Defaults to null (hidden). */
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  can,
  children,
  fallback = null,
}) => {
  return can ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGate;
