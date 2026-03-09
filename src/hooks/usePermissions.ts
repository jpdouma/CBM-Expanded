import { useAuth } from '../context/AuthProvider';
import { useProjects } from '../context/ProjectProvider';
import type { Permission } from '../types';

export const usePermissions = () => {
    const { currentUser } = useAuth();
    const { state } = useProjects();

    if (!currentUser) {
        return {
            canViewFinancials: false,
            canViewOps: false,
            canManageSettings: false,
            canManageUsers: false,
            canManageRoles: false,
            canManageFarmers: false,
            canLogReception: false,
            canManagePrimary: false,
            canManageSecondary: false,
            canApproveQuality: false,
            canApproveAccountant: false,
            canApproveDirector: false,
            canExecutePayments: false,
            canSetPricing: false,
            canViewClientPortal: false,
            isClientViewer: false,
            assignedClientId: undefined,
            // Legacy flags for compatibility
            canEdit: false,
            canApproveSteps: false,
            canManageFinances: false,
        };
    }

    const userRole = state.roles.find(r => r.id === currentUser.roleId);
    const permissions = userRole?.permissions || [];

    // Defensive fallback: Super Admins or legacy ADMINs get all permissions
    const isSuperAdmin = currentUser.roleId === 'system-admin-role' || currentUser.role === 'ADMIN';

    const hasPermission = (p: Permission) => isSuperAdmin || permissions.includes(p);

    const canViewFinancials = hasPermission('VIEW_DASHBOARD_FINANCE');
    const canViewOps = hasPermission('VIEW_DASHBOARD_OPS');
    const canManageSettings = hasPermission('MANAGE_SETTINGS');
    const canManageUsers = hasPermission('MANAGE_USERS');
    const canManageRoles = hasPermission('MANAGE_ROLES');
    const canManageFarmers = hasPermission('MANAGE_FARMERS');
    const canLogReception = hasPermission('LOG_RECEPTION');
    const canManagePrimary = hasPermission('MANAGE_PRIMARY_PROCESSING');
    const canManageSecondary = hasPermission('MANAGE_SECONDARY_PROCESSING');
    const canApproveQuality = hasPermission('APPROVE_TRANSITIONS_QUALITY');
    const canApproveAccountant = hasPermission('APPROVE_PAYMENTS_ACCOUNTANT');
    const canApproveDirector = hasPermission('APPROVE_PAYMENTS_DIRECTOR');
    const canExecutePayments = hasPermission('EXECUTE_PAYMENTS');
    const canSetPricing = hasPermission('SET_PRICING');
    const canViewClientPortal = hasPermission('VIEW_CLIENT_PORTAL');

    // Derived flags
    const isClientViewer = canViewClientPortal && !!currentUser.assignedClientId;

    return {
        role: userRole, // Return the full role object or just name if needed
        canViewFinancials,
        canViewOps,
        canManageSettings,
        canManageUsers,
        canManageRoles,
        canManageFarmers,
        canLogReception,
        canManagePrimary,
        canManageSecondary,
        canApproveQuality,
        canApproveAccountant,
        canApproveDirector,
        canExecutePayments,
        canSetPricing,
        canViewClientPortal,
        isClientViewer,
        assignedClientId: currentUser.assignedClientId,
        // Legacy flags for compatibility
        canEdit: canLogReception || canManagePrimary || canManageSecondary || canManageFarmers,
        canApproveSteps: canApproveQuality,
        canManageFinances: canApproveAccountant || canApproveDirector || canExecutePayments,
        canDelete: canManageSettings, // Map delete to manage settings for now
        canSetPrices: canSetPricing,
    };
};
