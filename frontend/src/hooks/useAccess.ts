import { useAppStore } from '../store/useAppStore';

/**
 * Converts a menuCode (e.g. 'lihat-stock', 'purchase-request', 'pr') into a standardized
 * PascalCase permission prefix (e.g. 'LihatStock', 'PurchaseRequest', 'PR').
 */
export function toPermissionPrefix(menuCode: string): string {
  const raw = (menuCode || '').trim();
  if (!raw) return 'Menu';
  const tokens = raw.split(/[-_\s.]+/).filter(Boolean);
  if (tokens.length === 1 && tokens[0].length <= 4) {
    return tokens[0].toUpperCase();
  }
  return tokens
    .map((t) => (t.length <= 3 && t === t.toUpperCase() ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()))
    .join('');
}

export interface MenuCrudAccess {
  menuCode: string;
  modulePrefix: string;
  permissionCodes: {
    read: string;
    create: string;
    edit: string;
    delete: string;
    approve: string;
    export: string;
  };
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

export function useAccess() {
  const currentUser = useAppStore((s) => s.currentUser);

  const hasRole = (roleCode: string) =>
    currentUser.roles.some((r) => r.toLowerCase() === roleCode.toLowerCase());

  const hasPermission = (permissionCode: string) =>
    currentUser.permissions.some((p) => p.toLowerCase() === permissionCode.toLowerCase());

  const hasMinJobRank = (minRank: number) => currentUser.jobRank >= minRank;

  // Section 5 PRD: Auditor is strictly Global Read-Only (SoD)
  const isReadOnlyAuditor =
    currentUser.roles.length > 0 && currentUser.roles.every((r) => r === 'AUDITOR');

  const isSuperAdmin = hasRole('SUPERADMIN');

  const getMenuAccess = (menuCode: string): MenuCrudAccess => {
    const modulePrefix = toPermissionPrefix(menuCode);
    const permissionCodes = {
      read: `${modulePrefix}.Read`,
      create: `${modulePrefix}.Create`,
      edit: `${modulePrefix}.Edit`,
      delete: `${modulePrefix}.Delete`,
      approve: `${modulePrefix}.Approve`,
      export: `${modulePrefix}.Export`,
    };

    return {
      menuCode,
      modulePrefix,
      permissionCodes,
      canRead: isSuperAdmin || hasPermission(permissionCodes.read),
      canCreate: !isReadOnlyAuditor && (isSuperAdmin || hasPermission(permissionCodes.create)),
      canEdit: !isReadOnlyAuditor && (isSuperAdmin || hasPermission(permissionCodes.edit)),
      canDelete: !isReadOnlyAuditor && (isSuperAdmin || hasPermission(permissionCodes.delete)),
      canApprove: !isReadOnlyAuditor && (isSuperAdmin || hasPermission(permissionCodes.approve)),
      canExport: isSuperAdmin || hasPermission(permissionCodes.export) || hasPermission(permissionCodes.read),
    };
  };

  const canCreateTransaction = !isReadOnlyAuditor && hasPermission('Transaction.Create');
  const canApproveWorkflow = !isReadOnlyAuditor && hasPermission('Workflow.Approve');
  const canWriteMasterData = !isReadOnlyAuditor && (hasPermission('MasterData.Write') || hasRole('MASTER_DATA') || hasRole('SUPERADMIN'));
  const canManageServicedesk = !isReadOnlyAuditor && (hasPermission('Servicedesk.Manage') || hasRole('SERVICEDESK') || hasRole('SUPERADMIN'));
  const canManageSystemAdmin = !isReadOnlyAuditor && (hasPermission('System.Admin') || hasRole('SUPERADMIN'));

  return {
    currentUser,
    hasRole,
    hasPermission,
    hasMinJobRank,
    getMenuAccess,
    isReadOnlyAuditor,
    canCreateTransaction,
    canApproveWorkflow,
    canWriteMasterData,
    canManageServicedesk,
    canManageSystemAdmin,
  };
}

/**
 * Standardized hook for binding a screen's buttons (+ Tambah, Edit, Hapus, Approve, Export)
 * directly to the 6 standard RBAC permissions of a menu (`{Prefix}.Read/Create/Edit/Delete/Approve/Export`).
 */
export function useMenuAccess(menuCode: string): MenuCrudAccess {
  const { getMenuAccess } = useAccess();
  return getMenuAccess(menuCode);
}
