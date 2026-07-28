/**
 * resourceContext.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Context-Aware Resource Architecture — OrcaCloud Platform
 *
 * Every resource created on the platform must carry four metadata fields:
 *
 *   created_by_role         — 'enterprise' | 'developer'
 *   created_from_dashboard  — 'enterprise' | 'developer' | 'group'
 *   parent_context_id       — enterprise org id, group id, or ''
 *   return_path             — full frontend URL the user navigates back to
 *
 * This module provides utilities to derive those values from the current
 * URL, and to build the query params used by the backend list endpoints.
 *
 * Visibility rules (enforced at the viewset layer):
 *   Developer Dashboard  → created_from_dashboard='developer'
 *   Enterprise Dashboard → created_from_dashboard='enterprise' + parent_context_id=<orgId>
 *   Group Dashboard      → created_from_dashboard='group'      + parent_context_id=<groupId>
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardRole = 'enterprise' | 'developer'
export type DashboardContext = 'enterprise' | 'developer' | 'group'

/** The four origin metadata fields stored on every resource. */
export interface ResourceOrigin {
  created_by_role: DashboardRole
  created_from_dashboard: DashboardContext
  parent_context_id: string
  return_path: string
}

/** Query params sent to GET list endpoints to filter by context. */
export interface ContextListParams {
  dashboard: DashboardContext
  parent_context_id?: string
}

// ─── URL pattern matching ─────────────────────────────────────────────────────

/**
 * Extracts the enterprise org slug from a URL that matches
 * /enterprise/:orgSlug/...
 */
export function getEnterpriseSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/enterprise\/([^/]+)/)
  return m ? m[1] : null
}

/**
 * Extracts the group id from a URL that matches
 * /groups/:groupId/... or .../groups/:groupId/...
 */
export function getGroupIdFromPath(pathname: string): string | null {
  const m = pathname.match(/\/groups?\/([^/]+)/)
  return m ? m[1] : null
}

// ─── Main helpers ─────────────────────────────────────────────────────────────

/**
 * Derives the full ResourceOrigin from the current browser pathname.
 *
 * Usage inside a component:
 *   const origin = getResourceOrigin(location.pathname)
 *   await createDevWorkspace({ ...payload, ...origin })
 */
export function getResourceOrigin(pathname: string): ResourceOrigin {
  // Enterprise context
  const enterpriseSlug = getEnterpriseSlugFromPath(pathname)
  if (enterpriseSlug) {
    return {
      created_by_role: 'enterprise',
      created_from_dashboard: 'enterprise',
      parent_context_id: enterpriseSlug,
      return_path: pathname,
    }
  }

  // Group context inside developer area
  const groupId = getGroupIdFromPath(pathname)
  if (groupId) {
    return {
      created_by_role: 'developer',
      created_from_dashboard: 'group',
      parent_context_id: groupId,
      return_path: pathname,
    }
  }

  // Default — Developer Dashboard
  return {
    created_by_role: 'developer',
    created_from_dashboard: 'developer',
    parent_context_id: '',
    return_path: pathname,
  }
}

/**
 * Builds query params for a context-filtered list request.
 *
 * Usage:
 *   const params = getContextListParams(location.pathname, orgId)
 *   await listDevWorkspaces(params)
 */
export function getContextListParams(
  pathname: string,
  parentContextId?: string,
): ContextListParams {
  const enterpriseSlug = getEnterpriseSlugFromPath(pathname)
  if (enterpriseSlug) {
    return {
      dashboard: 'enterprise',
      parent_context_id: parentContextId ?? enterpriseSlug,
    }
  }

  const groupId = getGroupIdFromPath(pathname)
  if (groupId) {
    return {
      dashboard: 'group',
      parent_context_id: parentContextId ?? groupId,
    }
  }

  return { dashboard: 'developer' }
}

/**
 * Returns the dashboard context string for the given pathname.
 */
export function getDashboardContext(pathname: string): DashboardContext {
  if (getEnterpriseSlugFromPath(pathname)) return 'enterprise'
  if (getGroupIdFromPath(pathname)) return 'group'
  return 'developer'
}

/**
 * Returns the canonical return path for the given dashboard:
 *   enterprise → /enterprise/:orgSlug/workspace/:currentModule
 *   group      → /developer/groups/:groupId (or the full group path)
 *   developer  → /developer/workspaces
 */
export function buildReturnPath(
  pathname: string,
  overrides?: { orgSlug?: string; groupId?: string },
): string {
  const slug   = overrides?.orgSlug  ?? getEnterpriseSlugFromPath(pathname)
  const groupId = overrides?.groupId ?? getGroupIdFromPath(pathname)

  if (slug) {
    // Keep everything up to the current module root
    const moduleMatch = pathname.match(/^(\/enterprise\/[^/]+\/workspace\/[^/]+)/)
    return moduleMatch ? moduleMatch[1] : `/enterprise/${slug}/workspace`
  }

  if (groupId) {
    return `/developer/groups/${groupId}`
  }

  return '/developer/workspaces'
}
