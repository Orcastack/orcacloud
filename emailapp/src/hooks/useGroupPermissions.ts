/**
 * useGroupPermissions
 * ───────────────────
 * Fetches and caches the current user's permission set for a given group.
 *
 * Usage:
 *   const { can, role, loading } = useGroupPermissions(groupId)
 *   if (can('pipeline.run')) { ... }
 */

import { useCallback, useEffect, useState } from 'react'
import {
  getGroupPermissions,
  type GroupPermissionKey,
  type GroupPermissionSet,
  type GroupPermissionsResponse,
  type GroupRole,
} from '../services/groupsApi'

// ── In-memory cache (per groupId, cleared on component unmount is fine) ───────
const _cache = new Map<string, GroupPermissionsResponse>()

export interface UseGroupPermissionsResult {
  /** True while loading permissions from the server */
  loading: boolean
  /** Server-side error message, if any */
  error: string | null
  /** The user's role in this group */
  role: GroupRole | null
  /** Flat permission set for the current user */
  permissions: GroupPermissionSet | null
  /** Full matrix keyed by role (only populated for owner / admin) */
  roleMatrix: Record<GroupRole, GroupPermissionSet> | undefined
  /** Convenience: returns true when the user has the given permission */
  can: (perm: GroupPermissionKey) => boolean
  /** Returns true when the user has ALL of the listed permissions */
  canAll: (...perms: GroupPermissionKey[]) => boolean
  /** Returns true when the user has ANY of the listed permissions */
  canAny: (...perms: GroupPermissionKey[]) => boolean
  /** Force-refresh permissions from server */
  refresh: () => Promise<void>
}

export function useGroupPermissions(groupId: string | undefined): UseGroupPermissionsResult {
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [data, setData]           = useState<GroupPermissionsResponse | null>(null)

  const load = useCallback(async (invalidate = false) => {
    if (!groupId) {
      setLoading(false)
      return
    }
    if (!invalidate && _cache.has(groupId)) {
      setData(_cache.get(groupId)!)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resp = await getGroupPermissions(groupId)
      _cache.set(groupId, resp)
      setData(resp)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load permissions.')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { load() }, [load])

  const can = useCallback(
    (perm: GroupPermissionKey): boolean => data?.my_permissions?.[perm] ?? false,
    [data],
  )

  const canAll = useCallback(
    (...perms: GroupPermissionKey[]): boolean =>
      perms.every((p) => data?.my_permissions?.[p] ?? false),
    [data],
  )

  const canAny = useCallback(
    (...perms: GroupPermissionKey[]): boolean =>
      perms.some((p) => data?.my_permissions?.[p] ?? false),
    [data],
  )

  const refresh = useCallback(async () => {
    if (groupId) _cache.delete(groupId)
    await load(true)
  }, [groupId, load])

  return {
    loading,
    error,
    role:        data?.my_role ?? null,
    permissions: data?.my_permissions ?? null,
    roleMatrix:  data?.role_matrix,
    can,
    canAll,
    canAny,
    refresh,
  }
}

export default useGroupPermissions
