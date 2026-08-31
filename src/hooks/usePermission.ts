import { useAuthStore } from '@/stores/authStore'
import type { StaffPermissionKey } from '@/types'

/**
 * Returns true if the logged-in user has the given permission.
 * Admins / super_admins always return true.
 * Support agents must have the permission explicitly set to true.
 */
export function usePermission(key: StaffPermissionKey): boolean {
  return useAuthStore((s) => s.hasPermission(key))
}

/**
 * Returns true if the user has ALL of the given permissions.
 */
export function useAllPermissions(...keys: StaffPermissionKey[]): boolean {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  return keys.every((k) => hasPermission(k))
}
