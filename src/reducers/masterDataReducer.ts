// ==> src/reducers/masterDataReducer.ts <==
import type { ProjectState, ProjectAction, Project, Farmer } from '../types';
import { defaultClientDetails } from '../utils/projectHelpers';

const updateProjectInState = (state: ProjectState, projectId: string, updateFn: (project: Project) => Project): ProjectState => {
    return {
        ...state,
        projects: state.projects.map(p => (p.id === projectId ? updateFn(p) : p)),
    };
};

export const masterDataReducer = (state: ProjectState, action: any): ProjectState => {
    switch (action.type) {
        // --- FINANCIERS ---
        case 'ADD_FINANCIER': {
            const { financierData } = action.payload;
            if (!financierData.name.trim()) return state;
            if ((state.financiers || []).some(f => f.name.toLowerCase() === financierData.name.trim().toLowerCase())) {
                alert(`Financier "${financierData.name}" already exists.`);
                return state;
            }
            return { ...state, financiers: [...(state.financiers || []), { ...financierData, id: crypto.randomUUID(), name: financierData.name.trim() }] };
        }
        case 'UPDATE_FINANCIER':
            return { ...state, financiers: (state.financiers || []).map(f => f.id === action.payload.financierId ? { ...f, ...action.payload.updates } : f) };
        case 'DELETE_FINANCIER': {
            const { financierId } = action.payload;
            if (state.projects.some(p => p.financing.some(f => f.financierId === financierId) || p.financierIds?.includes(financierId))) {
                alert('Cannot delete: Financier is in use.');
                return state;
            }
            return { ...state, financiers: (state.financiers || []).filter(f => f.id !== financierId) };
        }

        // --- DRYING BEDS ---
        case 'ADD_DRYING_BED':
            return { ...state, dryingBeds: [...(state.dryingBeds || []), { ...action.payload.bedData, id: action.payload.id || crypto.randomUUID() }] };
        case 'UPDATE_DRYING_BED':
            return { ...state, dryingBeds: (state.dryingBeds || []).map(b => b.id === action.payload.bedId ? { ...b, ...action.payload.updates } : b) };
        case 'DELETE_DRYING_BED':
            if (state.projects.some(p => p.dryingBedIds?.includes(action.payload.bedId))) {
                alert('Cannot delete: Bed is assigned to a project.');
                return state;
            }
            return { ...state, dryingBeds: (state.dryingBeds || []).filter(b => b.id !== action.payload.bedId) };

        // --- FLOATING TANKS ---
        case 'ADD_FLOATING_TANK':
            return { ...state, floatingTanks: [...(state.floatingTanks || []), { ...action.payload.tankData, id: action.payload.id || crypto.randomUUID() }] };
        case 'UPDATE_FLOATING_TANK':
            return { ...state, floatingTanks: (state.floatingTanks || []).map(t => t.id === action.payload.tankId ? { ...t, ...action.payload.updates } : t) };
        case 'DELETE_FLOATING_TANK':
            if (state.projects.some(p => p.processingBatches?.some(b => b.floatingTankId === action.payload.tankId))) {
                alert('Cannot delete: Tank is currently assigned to an active batch.');
                return state;
            }
            return { ...state, floatingTanks: (state.floatingTanks || []).filter(t => t.id !== action.payload.tankId) };

        // --- CLIENTS ---
        case 'ADD_CLIENT':
            return { ...state, clients: [...(state.clients || []), { ...defaultClientDetails, ...action.payload.clientData, id: crypto.randomUUID() }] };
        case 'UPDATE_CLIENT':
            return { ...state, clients: (state.clients || []).map(c => c.id === action.payload.clientId ? { ...c, ...action.payload.updates } : c) };
        case 'DELETE_CLIENT':
            if (state.projects.some(p => p.clientId === action.payload.clientId)) {
                alert('Cannot delete: Client is assigned to a project.');
                return state;
            }
            return { ...state, clients: (state.clients || []).filter(c => c.id !== action.payload.clientId) };

        // --- STORAGE LOCATIONS ---
        case 'ADD_STORAGE_LOCATION': {
            const { locationData } = action.payload;
            return {
                ...state, storageLocations: [...(state.storageLocations || []), {
                    ...locationData,
                    id: crypto.randomUUID(),
                    facilityCode: locationData.facilityCode || locationData.name.substring(0, 3).toUpperCase(),
                    allowedZones: locationData.allowedZones || [],
                    allowedRows: locationData.allowedRows || [],
                    allowedPallets: locationData.allowedPallets || [],
                    allowedLevels: locationData.allowedLevels || ['A', 'B', 'C']
                }]
            };
        }
        case 'UPDATE_STORAGE_LOCATION':
            return { ...state, storageLocations: (state.storageLocations || []).map(l => l.id === action.payload.locationId ? { ...l, ...action.payload.updates } : l) };
        case 'DELETE_STORAGE_LOCATION':
            return { ...state, storageLocations: (state.storageLocations || []).filter(l => l.id !== action.payload.locationId) };

        // --- CONTAINERS ---
        case 'ADD_CONTAINER':
            return {
                ...state,
                containers: [...(state.containers || []), { ...action.payload.data, id: crypto.randomUUID() }]
            };
        case 'UPDATE_CONTAINER':
            return {
                ...state,
                containers: (state.containers || []).map(c =>
                    c.id === action.payload.containerId ? { ...c, ...action.payload.updates } : c
                )
            };
        case 'GENERATE_CONTAINERS': {
            const { count, date, tareWeightKg } = action.payload;
            const d = new Date(date);
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear().toString();
            const prefix = `${month}${year}`;

            const existingForMonth = (state.containers || []).filter(c => c.label.startsWith(prefix));
            let counter = 0;
            if (existingForMonth.length > 0) {
                const counters = existingForMonth.map(c => {
                    const parts = c.label.split('-');
                    return parts.length > 1 ? parseInt(parts[1]) : 0;
                });
                counter = Math.max(...counters);
            }

            const newContainers = [];
            for (let i = 1; i <= count; i++) {
                counter++;
                newContainers.push({
                    id: crypto.randomUUID(),
                    label: `${prefix}-${counter.toString().padStart(3, '0')}`,
                    weight: 0,
                    tareWeightKg: tareWeightKg || 1.5,
                    contributions: [],
                    date: date,
                    status: 'AVAILABLE' as const
                });
            }
            return { ...state, containers: [...(state.containers || []), ...newContainers] };
        }
        case 'DELETE_CONTAINER': {
            const { containerId } = action.payload;
            const isInUse = state.projects.some(p => p.processingBatches.some(b => b.containerIds.includes(containerId)));
            if (isInUse) {
                alert("Cannot delete: Container is currently assigned to a processing batch.");
                return state;
            }
            return { ...state, containers: (state.containers || []).filter(c => c.id !== containerId) };
        }
        case 'CLOSE_CONTAINER':
            return {
                ...state,
                containers: (state.containers || []).map(c => c.id === action.payload.containerId ? { ...c, status: 'IN_USE' } : c)
            };

        // --- FARMERS ---
        case 'ADD_FARMER': {
            const newFarmer = { ...action.payload.farmerData, id: action.payload.id || crypto.randomUUID() };
            if ((state.farmers || []).some(f => f.name.toLowerCase() === newFarmer.name.toLowerCase())) {
                alert(`Farmer "${newFarmer.name}" already exists.`);
                return state;
            }
            return { ...state, farmers: [...(state.farmers || []), newFarmer] };
        }
        case 'UPDATE_FARMER':
            return { ...state, farmers: (state.farmers || []).map(f => f.id === action.payload.farmerId ? { ...f, ...action.payload.updates } : f) };
        case 'DELETE_FARMER': {
            if (state.projects.some(p => p.farmerIds.includes(action.payload.farmerId) || p.deliveries.some(d => d.farmerId === action.payload.farmerId))) {
                alert("Cannot delete: Farmer has active associations.");
                return state;
            }
            return { ...state, farmers: (state.farmers || []).filter(f => f.id !== action.payload.farmerId) };
        }
        case 'IMPORT_GLOBAL_FARMERS': {
            const { farmersData } = action.payload;
            const newFarmers: Farmer[] = [];
            farmersData.forEach((fd: Partial<Farmer>) => {
                if (fd.name && !(state.farmers || []).some(existing => existing.name.toLowerCase() === fd.name!.toLowerCase())) {
                    newFarmers.push({ ...fd, name: fd.name!, id: crypto.randomUUID() } as Farmer);
                }
            });
            alert(`Imported ${newFarmers.length} new farmers.`);
            return { ...state, farmers: [...(state.farmers || []), ...newFarmers] };
        }
        case 'ADD_BULK_FARMERS': {
            const { projectId, farmers } = action.payload;
            const newGlobalFarmers: Farmer[] = [];
            const existingNames = new Set((state.farmers || []).map(f => f.name.toLowerCase()));

            farmers.filter((f: Partial<Farmer>) => f.name && !existingNames.has(f.name.toLowerCase())).forEach((f: Partial<Farmer>) => {
                newGlobalFarmers.push({ ...f, name: f.name!, id: crypto.randomUUID() } as Farmer);
                existingNames.add(f.name!.toLowerCase());
            });

            const newState = { ...state, farmers: [...(state.farmers || []), ...newGlobalFarmers] };

            return updateProjectInState(newState, projectId, p => {
                const ids = new Set(p.farmerIds);
                farmers.forEach((f: Partial<Farmer>) => {
                    const match = newState.farmers.find(af => af.name.toLowerCase() === f.name?.toLowerCase());
                    if (match) ids.add(match.id);
                });
                return { ...p, farmerIds: Array.from(ids) };
            });
        }

        // --- USERS & ROLES ---
        case 'ADD_USER':
            if ((state.users || []).some(u => u.username === action.payload.userData.username)) {
                alert("Username already exists.");
                return state;
            }
            return { ...state, users: [...(state.users || []), { ...action.payload.userData, id: crypto.randomUUID() }] };
        case 'UPDATE_USER':
            return { ...state, users: (state.users || []).map(u => u.id === action.payload.userId ? { ...u, ...action.payload.updates } : u) };
        case 'DELETE_USER':
            return { ...state, users: (state.users || []).filter(u => u.id !== action.payload.userId) };

        case 'ADD_ROLE':
            return { ...state, roles: [...(state.roles || []), { ...action.payload.roleData, id: crypto.randomUUID() }] };
        case 'UPDATE_ROLE':
            return { ...state, roles: (state.roles || []).map(r => r.id === action.payload.roleId ? { ...r, ...action.payload.updates } : r) };
        case 'CLONE_ROLE': {
            const { roleId, newName } = action.payload;
            const roleToClone = (state.roles || []).find(r => r.id === roleId);
            if (!roleToClone) return state;

            const clonedRole = {
                ...roleToClone,
                id: crypto.randomUUID(),
                name: newName,
                isSystem: false
            };

            return { ...state, roles: [...(state.roles || []), clonedRole] };
        }
        case 'DELETE_ROLE':
            if ((state.users || []).some(u => u.roleId === action.payload.roleId)) {
                alert("Cannot delete role: It is currently assigned to one or more users.");
                return state;
            }
            return { ...state, roles: (state.roles || []).filter(r => r.id !== action.payload.roleId) };

        // --- GLOBAL SETTINGS & PRICING ---
        case 'UPDATE_GLOBAL_SETTINGS':
            return {
                ...state,
                globalSettings: { ...(state.globalSettings || { processingCosts: [] }), ...action.payload.updates }
            };
        case 'PUBLISH_BUYING_PRICES':
            return {
                ...state,
                buyingPrices: [...(state.buyingPrices || []), { ...action.payload.data, id: action.payload.id || crypto.randomUUID() }]
            };

        default:
            return state;
    }
};