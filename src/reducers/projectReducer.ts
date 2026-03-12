// ==> src/reducers/projectReducer.ts <==
import type { ProjectState, ProjectAction, Project, Delivery, DryingBed, ClientDetails, Financier, Sale, ActivityLogEntryType, StorageLocation, Farmer, User, ProcessingBatch, ProcessingStage, PaymentLine, StoredBatch, HulledBatch, Container } from '../types';
import { dayDiff, getWeek } from '../utils/formatters';
import { defaultClientDetails, createNewProject, getRecalculatedDryingBeds } from '../utils/projectHelpers';
import { processImportedData } from '../utils/migrations';
import { getBatchProvenance } from '../utils/traceability';

export { defaultClientDetails };

export type AppProjectAction = ProjectAction;

const updateProjectInState = (state: ProjectState, projectId: string, updateFn: (project: Project) => Project): ProjectState => {
    return {
        ...state,
        projects: state.projects.map(p => (p.id === projectId ? updateFn(p) : p)),
    };
};

// --- Domain Handlers ---

const handleProjectManagement = (state: ProjectState, action: any): ProjectState => {
    switch (action.type) {
        case 'LOAD_STATE': {
            const payload = action.payload || {};
            return {
                ...state,
                ...payload,
                projects: (payload.projects || state.projects || []).map((p: any) => ({
                    ...p,
                    processingBatches: p.processingBatches || [],
                    dryingBatches: p.dryingBatches || [],
                    storedBatches: p.storedBatches || [],
                    hullingBatches: p.hullingBatches || [],
                    hulledBatches: p.hulledBatches || [],
                    sales: p.sales || [],
                    financing: p.financing || [],
                    deliveries: p.deliveries || [],
                    setupCosts: p.setupCosts || [],
                    advances: p.advances || [],
                    farmerIds: p.farmerIds || [],
                    preProjectChecklist: p.preProjectChecklist || { contractSigned: false, accountCardSubmitted: false, projectSetupComplete: false, forecastGenerated: false, firstWithdrawalReceived: false, projectStarted: false }
                })),
                selectedProjectIds: payload.selectedProjectIds || state.selectedProjectIds || [],
                dryingBeds: payload.dryingBeds || state.dryingBeds || [],
                clients: payload.clients || state.clients || [],
                financiers: payload.financiers || state.financiers || [],
                storageLocations: payload.storageLocations || state.storageLocations || [],
                farmers: payload.farmers || state.farmers || [],
                users: payload.users || state.users || [],
                roles: payload.roles?.length ? payload.roles : state.roles,
                globalSettings: payload.globalSettings || { processingCosts: [] },
                buyingPrices: payload.buyingPrices || state.buyingPrices || [],
                paymentLines: payload.paymentLines || state.paymentLines || [],
                containers: payload.containers || state.containers || [],
            };
        }
        case 'ADD_PROJECT': {
            const newProject = createNewProject(action.payload.name, action.payload.tier);
            if (action.payload.id) newProject.id = action.payload.id;
            return {
                ...state,
                projects: [...state.projects, newProject],
                selectedProjectIds: [newProject.id],
            };
        }
        case 'DELETE_PROJECT': {
            return {
                ...state,
                projects: state.projects.filter(p => p.id !== action.payload.projectId),
                selectedProjectIds: state.selectedProjectIds.filter(id => id !== action.payload.projectId),
            };
        }
        case 'UPDATE_PROJECT': {
            const { projectId, updates } = action.payload;
            const projectToUpdate = state.projects.find(p => p.id === projectId);
            if (!projectToUpdate) return state;

            let updatedProject = { ...projectToUpdate, ...updates };

            if ('estCostPerKgCherry' in updates || 'estCostPerKgCherryCurrency' in updates || 'exchangeRateUGXtoUSD' in updates) {
                const amount = updatedProject.estCostPerKgCherry || 0;
                const currency = updatedProject.estCostPerKgCherryCurrency || 'USD';
                const rate = updatedProject.exchangeRateUGXtoUSD || 3750;
                updatedProject.estCostPerKgCherryUSD = currency === 'USD' ? amount : amount / rate;
            }

            if (updates.isMachineDrying === true) {
                updatedProject.dryingBedIds = [];
            }

            if ('requiredGreenBeanMassKg' in updates || 'estShrinkFactor' in updates) {
                const { updatedBedIds, releasedBeds } = getRecalculatedDryingBeds(updatedProject, state.dryingBeds);
                if (releasedBeds.length > 0) {
                    const bedNames = releasedBeds.map(b => b.uniqueNumber).join(', ');
                    alert(`Project "${updatedProject.name}" requirements changed. Released beds: ${bedNames}`);
                }
                updatedProject.dryingBedIds = updatedBedIds;
            }

            return {
                ...state,
                projects: state.projects.map(p => (p.id === projectId ? updatedProject : p)),
            };
        }
        case 'SET_SELECTED_PROJECT_IDS':
            return { ...state, selectedProjectIds: action.payload.ids };
        case 'IMPORT_PROJECTS': {
            const processedData = processImportedData(
                action.payload.projects,
                action.payload.clients,
                action.payload.financiers,
                action.payload.dryingBeds,
                action.payload.storageLocations,
                action.payload.farmers
            );

            const projects = (processedData.projects || []).map((p: any) => ({
                ...p,
                processingBatches: p.processingBatches || [],
                dryingBatches: p.dryingBatches || [],
                storedBatches: p.storedBatches || [],
                hullingBatches: p.hullingBatches || [],
                hulledBatches: p.hulledBatches || [],
                sales: p.sales || [],
                financing: p.financing || [],
                deliveries: p.deliveries || [],
                setupCosts: p.setupCosts || [],
                advances: p.advances || [],
                farmerIds: p.farmerIds || [],
                preProjectChecklist: p.preProjectChecklist || { contractSigned: false, accountCardSubmitted: false, projectSetupComplete: false, forecastGenerated: false, firstWithdrawalReceived: false, projectStarted: false }
            }));

            return {
                ...state,
                ...processedData,
                projects,
                selectedProjectIds: [],
                containers: state.containers || [],
                buyingPrices: state.buyingPrices || [],
                paymentLines: state.paymentLines || [],
                globalSettings: state.globalSettings || { processingCosts: [] }
            };
        }
        case 'UPDATE_CHECKLIST_ITEM': {
            const { projectId, key, value } = action.payload;
            return updateProjectInState(state, projectId, p => ({
                ...p,
                preProjectChecklist: { ...p.preProjectChecklist, [key]: value },
            }));
        }
        case 'SAVE_FORECAST_SNAPSHOT':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                forecastSnapshots: [...(p.forecastSnapshots || []), action.payload.snapshot]
            }));
        case 'DELETE_FORECAST_SNAPSHOT':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                forecastSnapshots: (p.forecastSnapshots || []).filter(s => s.id !== action.payload.snapshotId)
            }));
        case 'UPDATE_GLOBAL_CURRENCY':
            return { ...state, globalCurrency: action.payload.currency };
        default: return state;
    }
};

const handleSettings = (state: ProjectState, action: ProjectAction): ProjectState => {
    switch (action.type) {
        case 'ADD_FINANCIER': {
            const { financierData } = action.payload;
            if (!financierData.name.trim()) return state;
            if (state.financiers.some(f => f.name.toLowerCase() === financierData.name.trim().toLowerCase())) {
                alert(`Financier "${financierData.name}" already exists.`);
                return state;
            }
            return { ...state, financiers: [...state.financiers, { ...financierData, id: crypto.randomUUID(), name: financierData.name.trim() }] };
        }
        case 'UPDATE_FINANCIER':
            return { ...state, financiers: state.financiers.map(f => f.id === action.payload.financierId ? { ...f, ...action.payload.updates } : f) };
        case 'DELETE_FINANCIER': {
            const { financierId } = action.payload;
            if (state.projects.some(p => p.financing.some(f => f.financierId === financierId) || p.financierIds?.includes(financierId))) {
                alert('Cannot delete: Financier is in use.');
                return state;
            }
            return { ...state, financiers: state.financiers.filter(f => f.id !== financierId) };
        }
        case 'ADD_DRYING_BED':
            return { ...state, dryingBeds: [...state.dryingBeds, { ...action.payload.bedData, id: action.payload.id || crypto.randomUUID() }] };
        case 'UPDATE_DRYING_BED':
            return { ...state, dryingBeds: state.dryingBeds.map(b => b.id === action.payload.bedId ? { ...b, ...action.payload.updates } : b) };
        case 'DELETE_DRYING_BED':
            if (state.projects.some(p => p.dryingBedIds?.includes(action.payload.bedId))) {
                alert('Cannot delete: Bed is assigned to a project.');
                return state;
            }
            return { ...state, dryingBeds: state.dryingBeds.filter(b => b.id !== action.payload.bedId) };
        case 'ADD_CLIENT':
            return { ...state, clients: [...state.clients, { ...defaultClientDetails, ...action.payload.clientData, id: crypto.randomUUID() }] };
        case 'UPDATE_CLIENT':
            return { ...state, clients: state.clients.map(c => c.id === action.payload.clientId ? { ...c, ...action.payload.updates } : c) };
        case 'DELETE_CLIENT':
            if (state.projects.some(p => p.clientId === action.payload.clientId)) {
                alert('Cannot delete: Client is assigned to a project.');
                return state;
            }
            return { ...state, clients: state.clients.filter(c => c.id !== action.payload.clientId) };
        case 'ADD_STORAGE_LOCATION': {
            const { locationData } = action.payload;
            return {
                ...state, storageLocations: [...state.storageLocations, {
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
            return { ...state, storageLocations: state.storageLocations.map(l => l.id === action.payload.locationId ? { ...l, ...action.payload.updates } : l) };
        case 'DELETE_STORAGE_LOCATION':
            return { ...state, storageLocations: state.storageLocations.filter(l => l.id !== action.payload.locationId) };
        case 'GENERATE_CONTAINERS': {
            const { count, date } = action.payload;
            const d = new Date(date);
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear().toString();
            const prefix = `${month}${year}`;

            const existingForMonth = state.containers.filter(c => c.label.startsWith(prefix));
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
                    contributions: [],
                    date: date,
                    status: 'AVAILABLE' as const
                });
            }
            return { ...state, containers: [...state.containers, ...newContainers] };
        }
        case 'DELETE_CONTAINER': {
            const { containerId } = action.payload;
            const isInUse = state.projects.some(p => p.processingBatches.some(b => b.containerIds.includes(containerId)));
            if (isInUse) {
                alert("Cannot delete: Container is currently assigned to a processing batch.");
                return state;
            }
            return { ...state, containers: state.containers.filter(c => c.id !== containerId) };
        }
        case 'ADD_FARMER': {
            const newFarmer = { ...action.payload.farmerData, id: action.payload.id || crypto.randomUUID() };
            if (state.farmers.some(f => f.name.toLowerCase() === newFarmer.name.toLowerCase())) {
                alert(`Farmer "${newFarmer.name}" already exists.`);
                return state;
            }
            return { ...state, farmers: [...state.farmers, newFarmer] };
        }
        case 'UPDATE_FARMER':
            return { ...state, farmers: state.farmers.map(f => f.id === action.payload.farmerId ? { ...f, ...action.payload.updates } : f) };
        case 'DELETE_FARMER': {
            if (state.projects.some(p => p.farmerIds.includes(action.payload.farmerId) || p.deliveries.some(d => d.farmerId === action.payload.farmerId))) {
                alert("Cannot delete: Farmer has active associations.");
                return state;
            }
            return { ...state, farmers: state.farmers.filter(f => f.id !== action.payload.farmerId) };
        }
        case 'IMPORT_GLOBAL_FARMERS': {
            const { farmersData } = action.payload;
            const newFarmers: Farmer[] = [];
            farmersData.forEach(fd => {
                if (fd.name && !state.farmers.some(existing => existing.name.toLowerCase() === fd.name!.toLowerCase())) {
                    newFarmers.push({ ...fd, name: fd.name!, id: crypto.randomUUID() });
                }
            });
            alert(`Imported ${newFarmers.length} new farmers.`);
            return { ...state, farmers: [...state.farmers, ...newFarmers] };
        }
        case 'ADD_BULK_FARMERS': {
            const { projectId, farmers } = action.payload;
            const newGlobalFarmers: Farmer[] = [];
            const existingNames = new Set(state.farmers.map(f => f.name.toLowerCase()));

            farmers.filter(f => f.name && !existingNames.has(f.name.toLowerCase())).forEach(f => {
                newGlobalFarmers.push({ ...f, name: f.name!, id: crypto.randomUUID() });
                existingNames.add(f.name!.toLowerCase());
            });

            const newState = { ...state, farmers: [...state.farmers, ...newGlobalFarmers] };
            return updateProjectInState(newState, projectId, p => {
                const ids = new Set(p.farmerIds);
                farmers.forEach(f => {
                    const match = newState.farmers.find(af => af.name.toLowerCase() === f.name?.toLowerCase());
                    if (match) ids.add(match.id);
                });
                return { ...p, farmerIds: Array.from(ids) };
            });
        }
        case 'ADD_USER':
            if (state.users.some(u => u.username === action.payload.userData.username)) {
                alert("Username already exists.");
                return state;
            }
            return { ...state, users: [...state.users, { ...action.payload.userData, id: crypto.randomUUID() }] };
        case 'UPDATE_USER':
            return { ...state, users: state.users.map(u => u.id === action.payload.userId ? { ...u, ...action.payload.updates } : u) };
        case 'DELETE_USER':
            return { ...state, users: state.users.filter(u => u.id !== action.payload.userId) };
        case 'ADD_ROLE':
            return { ...state, roles: [...state.roles, { ...action.payload.roleData, id: crypto.randomUUID() }] };
        case 'UPDATE_ROLE':
            return { ...state, roles: state.roles.map(r => r.id === action.payload.roleId ? { ...r, ...action.payload.updates } : r) };
        case 'CLONE_ROLE': {
            const { roleId, newName } = action.payload;
            const roleToClone = state.roles.find(r => r.id === roleId);
            if (!roleToClone) return state;

            const clonedRole = {
                ...roleToClone,
                id: crypto.randomUUID(),
                name: newName,
                isSystem: false
            };

            return { ...state, roles: [...state.roles, clonedRole] };
        }
        case 'DELETE_ROLE':
            if (state.users.some(u => u.roleId === action.payload.roleId)) {
                alert("Cannot delete role: It is currently assigned to one or more users.");
                return state;
            }
            return { ...state, roles: state.roles.filter(r => r.id !== action.payload.roleId) };
        default: return state;
    }
};

const handleFinance = (state: ProjectState, action: any): ProjectState => {
    switch (action.type) {
        case 'ADD_PROJECT_SETUP_COST':
            return updateProjectInState(state, action.payload.projectId, p => {
                const { cost } = action.payload;
                const amountUSD = cost.currency === 'USD' ? cost.amount : cost.amount / p.exchangeRateUGXtoUSD;
                return { ...p, setupCosts: [...(p.setupCosts || []), { ...cost, id: crypto.randomUUID(), amountUSD }] };
            });
        case 'UPDATE_PROJECT_SETUP_COST':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                setupCosts: p.setupCosts.map(c => c.id === action.payload.costId ?
                    { ...c, ...action.payload.updates, amountUSD: (action.payload.updates.currency || c.currency) === 'USD' ? (action.payload.updates.amount ?? c.amount) : (action.payload.updates.amount ?? c.amount) / p.exchangeRateUGXtoUSD }
                    : c)
            }));
        case 'REMOVE_PROJECT_SETUP_COST':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                setupCosts: p.setupCosts.filter(c => c.id !== action.payload.costId)
            }));
        case 'ADD_FINANCING':
            return updateProjectInState(state, action.payload.projectId, p => {
                const { data } = action.payload;
                const financier = state.financiers.find(f => f.id === data.financierId);
                if (!financier) return p;
                const currentDrawdown = p.financing.filter(f => f.financierId === data.financierId).reduce((sum, f) => sum + f.amountUSD, 0);
                if (currentDrawdown + data.amountUSD > financier.creditLimitUSD) {
                    alert(`Credit limit exceeded for ${financier.name}.`);
                    return p;
                }
                return { ...p, financing: [...p.financing, { ...data, id: crypto.randomUUID(), interestRateAnnual: financier.interestRateAnnual }] };
            });
        case 'ADD_ADVANCE': {
            const { projectId, data } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const amountUSD = data.currency === 'USD' ? data.amount : data.amount / project.exchangeRateUGXtoUSD;
            const advanceId = crypto.randomUUID();

            const newPaymentLine: PaymentLine = {
                id: crypto.randomUUID(),
                deliveryId: advanceId,
                farmerId: data.farmerId,
                amount: data.amount,
                currency: data.currency,
                status: 'PENDING_ACCOUNTANT',
                date: data.date
            };

            const updatedProject = {
                ...project,
                advances: [...project.advances, { ...data, id: advanceId, amountUSD }]
            };

            return {
                ...state,
                paymentLines: [...(state.paymentLines || []), newPaymentLine],
                projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
            };
        }
        case 'ADD_BULK_ADVANCES': {
            const { projectId, advancesData } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const newAdvances = [...project.advances];
            const newPaymentLines = [...(state.paymentLines || [])];
            const existingKeys = new Set(newAdvances.map(a => `${a.farmerId}-${a.date}-${a.amount}`));

            for (const d of advancesData) {
                const farmer = state.farmers.find(f => f.name.toLowerCase() === d.farmer_name?.trim().toLowerCase());
                if (!farmer) continue;
                const amt = parseFloat(d.amount);
                if (amt <= 0) continue;
                const key = `${farmer.id}-${d.date}-${amt}`;

                if (!existingKeys.has(key)) {
                    const cur = d.currency?.toUpperCase() === 'USD' ? 'USD' : 'UGX';
                    const advanceId = crypto.randomUUID();
                    const amountUSD = cur === 'USD' ? amt : amt / project.exchangeRateUGXtoUSD;

                    newAdvances.push({
                        id: advanceId,
                        farmerId: farmer.id,
                        date: d.date,
                        amount: amt,
                        currency: cur,
                        amountUSD
                    });

                    newPaymentLines.push({
                        id: crypto.randomUUID(),
                        deliveryId: advanceId,
                        farmerId: farmer.id,
                        amount: amt,
                        currency: cur,
                        status: 'PENDING_ACCOUNTANT',
                        date: d.date
                    });

                    existingKeys.add(key);
                }
            }

            return {
                ...state,
                paymentLines: newPaymentLines,
                projects: state.projects.map(p => p.id === projectId ? { ...project, advances: newAdvances } : p)
            };
        }
        case 'PUBLISH_BUYING_PRICES':
            return {
                ...state,
                buyingPrices: [...(state.buyingPrices || []), { ...action.payload.data, id: action.payload.id || crypto.randomUUID() }]
            };
        case 'ADD_PAYMENT_LINE':
            return {
                ...state,
                paymentLines: [...(state.paymentLines || []), { ...action.payload.data, id: crypto.randomUUID() }]
            };
        case 'UPDATE_PAYMENT_LINE_STATUS':
            return {
                ...state,
                paymentLines: (state.paymentLines || []).map(pl =>
                    pl.id === action.payload.paymentLineId
                        ? { ...pl, status: action.payload.status, authCode: action.payload.authCode || pl.authCode }
                        : pl
                )
            };
        case 'RECEPTION_DELIVERY': {
            // Simplified to ONLY handle the commercial transaction (no auto-chunking to containers here)
            const { projectId, farmerId, date, weight, unripe, earlyRipe, optimal, overRipe } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const today = new Date(date).getTime();
            const activePrices = (state.buyingPrices || []).find(p => {
                const start = new Date(p.validFrom).getTime();
                const end = new Date(p.validTo).getTime();
                return today >= start && today <= end;
            });

            if (!activePrices) return state;

            const payout = (weight * (unripe / 100) * activePrices.unripe) +
                (weight * (earlyRipe / 100) * activePrices.earlyRipe) +
                (weight * (optimal / 100) * activePrices.optimal) +
                (weight * (overRipe / 100) * activePrices.overRipe);

            const deliveryId = crypto.randomUUID();
            const costUSD = activePrices.currency === 'USD' ? payout : payout / project.exchangeRateUGXtoUSD;

            const farmerAdvances = project.advances.filter(a => a.farmerId === farmerId).reduce((s, a) => s + a.amountUSD, 0);
            const priorOffsets = project.deliveries.filter(d => d.farmerId === farmerId).reduce((s, d) => s + d.advanceOffsetUSD, 0);

            const advanceOffsetUSD = Math.min(farmerAdvances - priorOffsets, costUSD);
            const amountPaidUSD = costUSD - advanceOffsetUSD;

            const delivery: Delivery = {
                id: deliveryId, farmerId, date, weight, unripePercentage: unripe, earlyRipePercentage: earlyRipe, optimalPercentage: optimal, overRipePercentage: overRipe, cost: payout, currency: activePrices.currency, costUSD, advanceOffsetUSD, amountPaidUSD
            };

            const paymentLine: PaymentLine = {
                id: crypto.randomUUID(), deliveryId, farmerId, amount: payout, currency: activePrices.currency, status: 'PENDING_ACCOUNTANT', date
            };

            return {
                ...state,
                paymentLines: [...(state.paymentLines || []), paymentLine],
                projects: state.projects.map(p => p.id === projectId ? { ...p, deliveries: [...p.deliveries, delivery] } : p)
            };
        }
        case 'APPROVE_PAYMENT_ACCOUNTANT': {
            return {
                ...state,
                paymentLines: (state.paymentLines || []).map(pl =>
                    pl.id === action.payload.paymentLineId
                        ? { ...pl, status: 'PENDING_DIRECTOR' }
                        : pl
                )
            };
        }
        case 'APPROVE_PAYMENT_DIRECTOR': {
            return {
                ...state,
                paymentLines: (state.paymentLines || []).map(pl =>
                    pl.id === action.payload.paymentLineId
                        ? { ...pl, status: 'APPROVED_FOR_EXECUTION', authCode: action.payload.authCode }
                        : pl
                )
            };
        }
        case 'EXECUTE_PAYMENT': {
            return {
                ...state,
                paymentLines: (state.paymentLines || []).filter(pl => pl.id !== action.payload.paymentLineId)
            };
        }
        case 'UPDATE_GLOBAL_SETTINGS':
            return {
                ...state,
                globalSettings: { ...(state.globalSettings || { processingCosts: [] }), ...action.payload.updates }
            };
        case 'DELETE_FINANCING': {
            const { projectId, eventId } = action.payload;
            return updateProjectInState(state, projectId, p => ({
                ...p,
                financing: p.financing.filter(f => f.id !== eventId)
            }));
        }
        default: return state;
    }
};

const handleOperations = (state: ProjectState, action: ProjectAction): ProjectState => {
    switch (action.type) {
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
        case 'ASSIGN_CONTAINERS': {
            const { deliveryId, containerIds } = action.payload;
            const project = state.projects.find(p => p.id === action.payload.projectId);
            const delivery = project?.deliveries.find(d => d.id === deliveryId);
            if (!delivery) return state;

            let updatedContainers = [...(state.containers || [])];

            // Calculate how much of this delivery is already assigned
            const alreadyAssigned = updatedContainers.flatMap(c => c.contributions).filter(c => c.deliveryId === deliveryId).reduce((sum, c) => sum + c.weight, 0);
            let remainingToAssign = delivery.weight - alreadyAssigned;

            // Fill the selected containers up to 48kg
            containerIds.forEach((cid: string) => {
                const cIndex = updatedContainers.findIndex(c => c.id === cid);
                if (cIndex > -1 && remainingToAssign > 0) {
                    const container = updatedContainers[cIndex];
                    const space = 48 - (container.weight || 0);
                    if (space > 0) {
                        const toAdd = Math.min(space, remainingToAssign);
                        updatedContainers[cIndex] = {
                            ...container,
                            weight: (container.weight || 0) + toAdd,
                            contributions: [...(container.contributions || []), { farmerId: delivery.farmerId, deliveryId: delivery.id, weight: toAdd }],
                            status: 'IN_USE'
                        };
                        remainingToAssign -= toAdd;
                    }
                }
            });

            return { ...state, containers: updatedContainers };
        }
        case 'INITIALIZE_BATCH': {
            const { projectId, containerIds, initialStage, dryingBedId, startDate } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            if (containerIds.length !== 5) {
                alert("Exactly 5 containers (240kg) are required to start a batch.");
                return state;
            }

            const containersToLoad = (state.containers || []).filter(c => containerIds.includes(c.id));
            const totalWeight = containersToLoad.reduce((sum, c) => sum + c.weight, 0);

            // 1. Snapshot Traceability from the physical containers
            const traceabilitySnapshot: { farmerId: string, weightKg: number }[] = [];
            containersToLoad.forEach(c => {
                c.contributions.forEach(contrib => {
                    const existing = traceabilitySnapshot.find(t => t.farmerId === contrib.farmerId);
                    if (existing) existing.weightKg += contrib.weight;
                    else traceabilitySnapshot.push({ farmerId: contrib.farmerId, weightKg: contrib.weight });
                });
            });

            // 2. WIPE the physical containers so they can be reused
            const updatedContainers = (state.containers || []).map(c =>
                containerIds.includes(c.id)
                    ? { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const }
                    : c
            );

            // 3. Create the processing batch
            const d = new Date(startDate);
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const weekNum = getWeek(d);
            const weekStr = weekNum.toString().padStart(2, '0');
            const year = d.getFullYear().toString().slice(-2);

            let bedName = 'WET'; // Default fallback for Tier 1 which goes to floating basin first
            if (dryingBedId) {
                const bed = state.dryingBeds.find(b => b.id === dryingBedId);
                if (bed) bedName = bed.uniqueNumber;
            }

            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

            const newBatch: ProcessingBatch = {
                id: `${dayOfWeek}-wk${weekStr}${year}-${bedName}-${randomSuffix}`,
                projectId: project.id,
                containerIds,
                dryingBedId, // Could be undefined if Tier 1 starts at FLOATING
                currentStage: initialStage,
                status: 'IN_PROGRESS', // Unblocked: Operators can immediately begin logging results
                weight: totalWeight,
                moistureLogs: [],
                traceabilitySnapshot, // Save the snapshot!
                history: [{ stage: initialStage, startDate }]
            };

            const updatedProject = {
                ...project,
                processingBatches: [...(project.processingBatches || []), newBatch]
            };

            return {
                ...state,
                containers: updatedContainers,
                projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
            };
        }
        case 'COMPLETE_FLOATING': {
            const { projectId, batchId, sinkerWeight, floaterWeight, sinkerContainerIds, floaterContainerIds, completedBy, endDate } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const batch = (project.processingBatches || []).find(b => b.id === batchId);
            if (!batch) return state;

            const originalBatchWeight = batch.weight;
            const sinkerRatio = originalBatchWeight > 0 ? sinkerWeight / originalBatchWeight : 0;
            const floaterRatio = originalBatchWeight > 0 ? floaterWeight / originalBatchWeight : 0;

            const originalSnapshot = batch.traceabilitySnapshot || [];

            // Homogenous farmer ratios based on the original batch snapshot
            const farmerRatios = originalBatchWeight > 0
                ? originalSnapshot.map(s => ({ farmerId: s.farmerId, ratio: s.weightKg / originalBatchWeight }))
                : [];

            // Overwrite the batch's traceabilitySnapshot for the Sinkers
            const newSinkerSnapshot = originalSnapshot.map(entry => ({
                farmerId: entry.farmerId,
                weightKg: entry.weightKg * sinkerRatio
            }));

            // 1. WIPE original basin crates BEFORE sequentially filling the newly selected crates.
            let updatedContainers = (state.containers || []).map(c => {
                if (batch.containerIds.includes(c.id)) {
                    return { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const };
                }
                return c;
            });

            // Helper to sequentially fill crates to a max of 48kg using homogenous ratios
            const fillContainersSequentially = (targetIds: string[], totalWeight: number, targetStatus: 'IN_USE' | 'QUARANTINED') => {
                let remainingWeight = totalWeight;
                targetIds.forEach(cid => {
                    const cIndex = updatedContainers.findIndex(c => c.id === cid);
                    if (cIndex > -1 && remainingWeight > 0) {
                        const space = 48 - (updatedContainers[cIndex].weight || 0); // Safely handle partially filled crates
                        const fillAmount = Math.min(space, remainingWeight);
                        if (fillAmount > 0) {
                            const containerContributions = farmerRatios.map(r => ({
                                farmerId: r.farmerId,
                                deliveryId: batchId, // Reference the batch as the source for downstream ops
                                weight: r.ratio * fillAmount
                            }));

                            updatedContainers[cIndex] = {
                                ...updatedContainers[cIndex],
                                status: targetStatus,
                                weight: (updatedContainers[cIndex].weight || 0) + fillAmount,
                                contributions: [...(updatedContainers[cIndex].contributions || []), ...containerContributions]
                            };
                            remainingWeight -= fillAmount;
                        }
                    }
                });
            };

            // 2. Fill Sinker Crates sequentially
            fillContainersSequentially(sinkerContainerIds, sinkerWeight, 'IN_USE');

            // 3. Fill Floater Crates sequentially
            fillContainersSequentially(floaterContainerIds, floaterWeight, 'QUARANTINED');

            const newHistory = [...batch.history];
            const existingIndex = newHistory.findIndex(h => h.stage === 'FLOATING' && !h.endDate);
            if (existingIndex !== -1) {
                newHistory[existingIndex] = {
                    ...newHistory[existingIndex],
                    endDate,
                    completedBy,
                    weightOut: sinkerWeight,
                    floaterWeight
                };
            } else {
                newHistory.push({
                    stage: 'FLOATING',
                    startDate: endDate, // Assuming immediate completion if not started previously
                    endDate,
                    completedBy,
                    weightOut: sinkerWeight,
                    floaterWeight
                });
            }

            // Auto-Advance Logic
            const allStages: ProcessingStage[] = ['RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'DESICCATION', 'RESTING', 'DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING', 'EXPORT_READY'];
            const isTier1 = project.tier === 'HIGH_COMMERCIAL';
            const activeStages = isTier1 ? allStages : allStages.filter(s => !['FLOATING', 'PULPING', 'FERMENTATION'].includes(s));
            const currentIndex = activeStages.indexOf('FLOATING');
            const nextStage = currentIndex < activeStages.length - 1 ? activeStages[currentIndex + 1] : 'FLOATING';

            newHistory.push({
                stage: nextStage,
                startDate: endDate
            });

            const updatedBatch = {
                ...batch,
                weight: sinkerWeight,
                containerIds: sinkerContainerIds,
                traceabilitySnapshot: newSinkerSnapshot,
                history: newHistory,
                status: 'IN_PROGRESS' as const,
                currentStage: nextStage
            };

            const updatedProject = {
                ...project,
                processingBatches: project.processingBatches.map(b => b.id === batchId ? updatedBatch : b)
            };

            return {
                ...state,
                containers: updatedContainers,
                projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
            };
        }
        case 'MERGE_BATCHES': {
            const { projectId, sourceBatchIds, newContainerIds, startDate, completedBy } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const sourceBatches = project.processingBatches.filter(b => sourceBatchIds.includes(b.id));
            if (sourceBatches.length === 0) return state;

            const totalWeight = sourceBatches.reduce((sum, b) => sum + b.weight, 0);
            const currentStage = sourceBatches[0].currentStage;

            // Aggregate Traceability
            const aggregatedSnapshot: { farmerId: string, weightKg: number }[] = [];
            sourceBatches.forEach(b => {
                (b.traceabilitySnapshot || []).forEach(snap => {
                    const existing = aggregatedSnapshot.find(s => s.farmerId === snap.farmerId);
                    if (existing) {
                        existing.weightKg += snap.weightKg;
                    } else {
                        aggregatedSnapshot.push({ ...snap });
                    }
                });
            });

            // WIPE old crates
            const allOldCrateIds = sourceBatches.flatMap(b => b.containerIds);
            let updatedContainers = (state.containers || []).map(c => {
                if (allOldCrateIds.includes(c.id)) {
                    return { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const };
                }
                return c;
            });

            // Calculate ratios from aggregated snapshot
            const farmerRatios = totalWeight > 0 ? aggregatedSnapshot.map(s => ({ farmerId: s.farmerId, ratio: s.weightKg / totalWeight })) : [];

            // Generate New Batch ID
            const d = new Date(startDate);
            const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
            const weekNum = getWeek(d);
            const weekStr = weekNum.toString().padStart(2, '0');
            const year = d.getFullYear().toString().slice(-2);

            let bedName = 'WET';
            const firstDryingBedId = sourceBatches.find(b => b.dryingBedId)?.dryingBedId;
            if (firstDryingBedId) {
                const bed = state.dryingBeds.find(b => b.id === firstDryingBedId);
                if (bed) bedName = bed.uniqueNumber;
            }

            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const newBatchId = `${dayOfWeek}-wk${weekStr}${year}-${bedName}-${randomSuffix}`;

            // Fill new crates sequentially
            let remainingWeight = totalWeight;
            newContainerIds.forEach(cid => {
                const cIndex = updatedContainers.findIndex(c => c.id === cid);
                if (cIndex > -1 && remainingWeight > 0) {
                    const space = 48 - (updatedContainers[cIndex].weight || 0); // Should be 48 if wiped
                    const fillAmount = Math.min(space, remainingWeight);
                    if (fillAmount > 0) {
                        const containerContributions = farmerRatios.map(r => ({
                            farmerId: r.farmerId,
                            deliveryId: newBatchId, // Reference the merged batch
                            weight: r.ratio * fillAmount
                        }));

                        updatedContainers[cIndex] = {
                            ...updatedContainers[cIndex],
                            status: 'IN_USE',
                            weight: (updatedContainers[cIndex].weight || 0) + fillAmount,
                            contributions: [...(updatedContainers[cIndex].contributions || []), ...containerContributions]
                        };
                        remainingWeight -= fillAmount;
                    }
                }
            });

            // Construct new batch
            const newBatch: ProcessingBatch = {
                id: newBatchId,
                projectId: project.id,
                containerIds: newContainerIds,
                dryingBedId: firstDryingBedId,
                currentStage: currentStage,
                status: 'PENDING_APPROVAL',
                weight: totalWeight,
                moistureLogs: [],
                traceabilitySnapshot: aggregatedSnapshot,
                history: [{ stage: currentStage, startDate, completedBy }]
            };

            // Retire source batches
            const updatedBatches = project.processingBatches.map(b => {
                if (sourceBatchIds.includes(b.id)) {
                    return { ...b, status: 'COMPLETED' as const, consumedByBatchId: newBatchId };
                }
                return b;
            });
            updatedBatches.push(newBatch);

            return {
                ...state,
                containers: updatedContainers,
                projects: state.projects.map(p => p.id === projectId ? { ...p, processingBatches: updatedBatches } : p)
            };
        }
        case 'COMPLETE_PROCESSING_STEP': {
            const payload = action.payload as any;
            const { projectId, batchId, weightOut, endDate, isOutsourced, outsourcedCost, completedBy, newBedId } = payload;
            const stages = payload.stages || [payload.stage];

            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const batch = (project.processingBatches || []).find(b => b.id === batchId);
            if (!batch) return state;

            const updatedHistory = [...batch.history];
            const stagesArray = Array.isArray(stages) ? stages : [stages];

            stagesArray.forEach((stage: ProcessingStage) => {
                const existingIndex = updatedHistory.findIndex(h => h.stage === stage && !h.endDate);
                if (existingIndex !== -1) {
                    updatedHistory[existingIndex] = {
                        ...updatedHistory[existingIndex],
                        endDate,
                        completedBy,
                        weightOut,
                        isOutsourced,
                        outsourcedCost
                    };
                } else {
                    updatedHistory.push({
                        stage,
                        startDate: endDate,
                        endDate,
                        completedBy,
                        weightOut,
                        isOutsourced,
                        outsourcedCost
                    });
                }
            });

            // Auto-Advance Logic
            const allStages: ProcessingStage[] = ['RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'DESICCATION', 'RESTING', 'DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING', 'EXPORT_READY'];
            const isTier1 = project.tier === 'HIGH_COMMERCIAL';
            const activeStages = isTier1 ? allStages : allStages.filter(s => !['FLOATING', 'PULPING', 'FERMENTATION'].includes(s));

            const lastCompletedStage = stagesArray[stagesArray.length - 1];
            const currentIndex = activeStages.indexOf(lastCompletedStage);
            const nextStage = currentIndex < activeStages.length - 1 ? activeStages[currentIndex + 1] : lastCompletedStage;

            if (nextStage !== lastCompletedStage) {
                updatedHistory.push({
                    stage: nextStage,
                    startDate: endDate
                });
            }

            const updatedBatch = {
                ...batch,
                status: nextStage === 'EXPORT_READY' ? 'COMPLETED' as const : 'IN_PROGRESS' as const,
                currentStage: nextStage,
                weight: weightOut ?? batch.weight,
                dryingBedId: newBedId || batch.dryingBedId,
                history: updatedHistory
            };

            const updatedProject = {
                ...project,
                processingBatches: project.processingBatches.map(b => b.id === batchId ? updatedBatch : b)
            };

            let newPaymentLines = state.paymentLines || [];
            if (isOutsourced && outsourcedCost) {
                newPaymentLines = [
                    ...newPaymentLines,
                    {
                        id: crypto.randomUUID(),
                        deliveryId: batchId,
                        farmerId: 'OUTSOURCED',
                        amount: outsourcedCost,
                        currency: 'UGX',
                        status: 'PENDING_ACCOUNTANT',
                        date: endDate
                    }
                ];
            }

            return {
                ...state,
                paymentLines: newPaymentLines,
                projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
            };
        }
        case 'APPROVE_PROCESSING_STEP': {
            const { projectId, batchId, approvedBy } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const batch = (project.processingBatches || []).find(b => b.id === batchId);
            if (!batch) return state;

            const updatedHistory = [...batch.history];
            const unapprovedSteps = updatedHistory.filter(h => h.endDate && !h.approvedBy);

            unapprovedSteps.forEach(step => {
                const idx = updatedHistory.findIndex(h => h === step);
                updatedHistory[idx] = { ...step, approvedBy };
            });

            // Tier-Aware Dynamic Routing
            const allStages: ProcessingStage[] = ['RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'DESICCATION', 'RESTING', 'DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING', 'EXPORT_READY'];
            const isTier1 = project.tier === 'HIGH_COMMERCIAL';
            const activeStages = isTier1 ? allStages : allStages.filter(s => !['FLOATING', 'PULPING', 'FERMENTATION'].includes(s));

            const lastCompletedStage = updatedHistory.slice().reverse().find(h => h.endDate)?.stage || batch.currentStage;
            const currentIndex = activeStages.indexOf(lastCompletedStage);
            const nextStage = currentIndex < activeStages.length - 1 ? activeStages[currentIndex + 1] : lastCompletedStage;

            if (nextStage !== lastCompletedStage && !updatedHistory.some(h => h.stage === nextStage)) {
                updatedHistory.push({
                    stage: nextStage,
                    startDate: new Date().toISOString().split('T')[0]
                });
            }

            const updatedBatch = {
                ...batch,
                status: nextStage === 'EXPORT_READY' ? 'COMPLETED' as const : 'IN_PROGRESS' as const,
                currentStage: nextStage,
                history: updatedHistory
            };

            if (nextStage === 'RESTING' && updatedBatch.dryingBedId) {
                updatedBatch.dryingBedId = undefined;
            }

            const updatedProject = {
                ...project,
                processingBatches: project.processingBatches.map(b => b.id === batchId ? updatedBatch : b)
            };

            return {
                ...state,
                projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
            };
        }
        case 'APPROVE_CONTAINER_LOADING': {
            const { projectId, batchId, officialStartDate, approvedBy } = action.payload;
            return updateProjectInState(state, projectId, p => ({
                ...p,
                processingBatches: (p.processingBatches || []).map(b =>
                    b.id === batchId ? {
                        ...b,
                        status: 'IN_PROGRESS',
                        history: b.history.map((h, i) => i === 0 ? { ...h, startDate: officialStartDate, approvedBy } : h)
                    } : b
                )
            }));
        }
        case 'SET_OUTSOURCED_COST': {
            const { projectId, batchId, stage, cost } = action.payload;
            return updateProjectInState(state, projectId, p => ({
                ...p,
                processingBatches: (p.processingBatches || []).map(b =>
                    b.id === batchId ? {
                        ...b,
                        history: b.history.map(h => h.stage === stage ? { ...h, outsourcedCost: cost } : h)
                    } : b
                )
            }));
        }
        case 'ADD_BATCH_MOISTURE_MEASUREMENT':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                processingBatches: (p.processingBatches || []).map(b =>
                    b.id === action.payload.batchId
                        ? { ...b, moistureLogs: [...(b.moistureLogs || []), { ...action.payload.data, id: crypto.randomUUID() }] }
                        : b
                )
            }));
        case 'UPDATE_BATCH_CUPPING_SCORE':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                processingBatches: (p.processingBatches || []).map(b =>
                    b.id === action.payload.batchId
                        ? { ...b, cuppingScore: action.payload.score }
                        : b
                )
            }));

        case 'START_DRYING':
            return updateProjectInState(state, action.payload.projectId, p => {
                if (p.dryingBatches.some(db => db.deliveryId === action.payload.deliveryId)) return p;
                const delivery = p.deliveries.find(d => d.id === action.payload.deliveryId);
                if (!delivery) return p;
                const endDate = new Date(action.payload.startDate);
                endDate.setDate(endDate.getDate() + p.estDryingTimeDays);
                return { ...p, dryingBatches: [...p.dryingBatches, { id: crypto.randomUUID(), deliveryId: delivery.id, startDate: action.payload.startDate, estimatedEndDate: endDate.toISOString().split('T')[0], initialCherryWeight: delivery.weight, moistureMeasurements: [] }] };
            });
        case 'ADD_MOISTURE_MEASUREMENT':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                dryingBatches: p.dryingBatches.map(db => db.id === action.payload.dryingBatchId ? { ...db, moistureMeasurements: [...db.moistureMeasurements, { ...action.payload.data, id: crypto.randomUUID() }] } : db)
            }));
        case 'MOVE_TO_STORAGE':
            return updateProjectInState(state, action.payload.projectId, p => {
                const { sourceId, sourceType, storageDate, cuppingScore1 } = action.payload;
                let newBatch: StoredBatch;
                if (sourceType === 'delivery') {
                    const del = p.deliveries.find(d => d.id === sourceId);
                    if (!del || p.storedBatches.some(sb => sb.deliveryId === sourceId)) return p;
                    newBatch = { id: crypto.randomUUID(), deliveryId: del.id, dryingBatchId: null, storageDate, initialCherryWeight: del.weight, actualDryingDays: 0, cuppingScore1 };
                } else {
                    const db = p.dryingBatches.find(d => d.id === sourceId);
                    if (!db || p.storedBatches.some(sb => sb.dryingBatchId === sourceId)) return p;
                    const del = p.deliveries.find(d => d.id === db.deliveryId);
                    if (!del) return p;
                    newBatch = { id: crypto.randomUUID(), deliveryId: del.id, dryingBatchId: db.id, storageDate, initialCherryWeight: db.initialCherryWeight, actualDryingDays: dayDiff(new Date(db.startDate), new Date(storageDate)), cuppingScore1 };
                }
                return { ...p, storedBatches: [...p.storedBatches, newBatch] };
            });
        case 'START_HULLING':
            return updateProjectInState(state, action.payload.projectId, p => {
                if (p.hullingBatches.some(hb => hb.storedBatchId === action.payload.storedBatchId)) return p;
                return { ...p, hullingBatches: [...p.hullingBatches, { id: crypto.randomUUID(), storedBatchId: action.payload.storedBatchId, startDate: action.payload.startDate }] };
            });
        case 'COMPLETE_HULLING':
            return updateProjectInState(state, action.payload.projectId, p => {
                const { storedBatchIds, greenBeanWeight, remainderWeight, hullingDate, warehouseLocation, storageZone, bagWeightKg, bagCount, cuppingScore2, remainderLocation, remainderStorageZone, remainderPalletId, mergeRemainderBatchIds } = action.payload;
                const validSourceBatches = p.storedBatches.filter(sb => storedBatchIds.includes(sb.id));
                if (validSourceBatches.length === 0) return p;

                const primaryDeliveryId = validSourceBatches[0].deliveryId;
                const totalCherry = validSourceBatches.reduce((sum, sb) => sum + sb.initialCherryWeight, 0);
                const newBatches: HulledBatch[] = [];
                const newMainId = crypto.randomUUID();

                if (greenBeanWeight > 0) {
                    newBatches.push({
                        id: newMainId, storedBatchId: validSourceBatches[0].id, sourceBatchIds: storedBatchIds, deliveryId: primaryDeliveryId,
                        hullingDate, initialCherryWeight: totalCherry, greenBeanWeight, cuppingScore2,
                        warehouseLocation, storageZone, palletLevel: 'A', bagWeightKg, bagCount, isRemainder: false
                    });
                }
                if (remainderWeight && remainderWeight > 0) {
                    newBatches.push({
                        id: crypto.randomUUID(), storedBatchId: validSourceBatches[0].id, sourceBatchIds: storedBatchIds, deliveryId: primaryDeliveryId,
                        hullingDate, initialCherryWeight: 0, greenBeanWeight: remainderWeight, cuppingScore2,
                        warehouseLocation: remainderLocation, storageZone: remainderStorageZone, palletId: remainderPalletId || 'REM', palletLevel: 'A', bagWeightKg: 0, bagCount: 0, isRemainder: true
                    });
                }

                let updatedHulled = [...p.hulledBatches];
                if (mergeRemainderBatchIds?.length) {
                    updatedHulled = updatedHulled.map(hb => mergeRemainderBatchIds.includes(hb.id) ? { ...hb, consumedByBatchId: newMainId } : hb);
                }

                return { ...p, hulledBatches: [...updatedHulled, ...newBatches] };
            });
        case 'MOVE_BATCH_STOCK':
            return updateProjectInState(state, action.payload.projectId, p => {
                const { batchId, bagsToMove, locationData } = action.payload;
                const idx = p.hulledBatches.findIndex(b => b.id === batchId);
                if (idx === -1) return p;

                const source = p.hulledBatches[idx];
                if (!source.bagCount || bagsToMove <= 0 || bagsToMove > source.bagCount) return p;
                const newBatches = [...p.hulledBatches];

                if (bagsToMove === source.bagCount) {
                    newBatches[idx] = { ...source, ...locationData };
                } else {
                    const weightPerBag = source.greenBeanWeight / source.bagCount;
                    newBatches[idx] = { ...source, bagCount: source.bagCount - bagsToMove, greenBeanWeight: source.greenBeanWeight - (weightPerBag * bagsToMove) };
                    newBatches.push({ ...source, id: crypto.randomUUID(), bagCount: bagsToMove, greenBeanWeight: weightPerBag * bagsToMove, ...locationData });
                }
                return { ...p, hulledBatches: newBatches };
            });
        case 'ADD_SALE':
            return updateProjectInState(state, action.payload.projectId, p => {
                const { data } = action.payload;
                const newHulledBatches = [...p.hulledBatches];
                const soldBatchIds: string[] = [];

                // Process each item to handle splits if necessary
                if (data.items) {
                    data.items.forEach(item => {
                        const batchIndex = newHulledBatches.findIndex(b => b.id === item.batchId);
                        if (batchIndex === -1) return;

                        const originalBatch = newHulledBatches[batchIndex];

                        // Scenario 1: Full Sale (All bags selected)
                        const isFullSale = (originalBatch.bagCount && item.bags >= originalBatch.bagCount) || (!originalBatch.bagCount);

                        if (isFullSale) {
                            soldBatchIds.push(originalBatch.id);
                        } else {
                            // Scenario 2: Partial Sale (Split Required)
                            const weightPerBag = originalBatch.bagWeightKg || (originalBatch.greenBeanWeight / (originalBatch.bagCount || 1));
                            const soldWeight = weightPerBag * item.bags;

                            // 1. Create "Sold" Batch (New ID)
                            const soldBatch: HulledBatch = {
                                ...originalBatch,
                                id: crypto.randomUUID(),
                                bagCount: item.bags,
                                greenBeanWeight: soldWeight,
                            };

                            // 2. Update Original "Remaining" Batch
                            const remainingBags = (originalBatch.bagCount || 0) - item.bags;
                            const remainingWeight = originalBatch.greenBeanWeight - soldWeight;

                            newHulledBatches[batchIndex] = {
                                ...originalBatch,
                                bagCount: remainingBags,
                                greenBeanWeight: remainingWeight
                            };

                            // Add the *new* sold batch to the project list so the Sale can reference it
                            newHulledBatches.push(soldBatch);
                            soldBatchIds.push(soldBatch.id);
                        }
                    });
                }

                // Recalculate total weight based on the final sold batches
                const totalWeight = soldBatchIds.reduce((sum, id) => {
                    const b = newHulledBatches.find(batch => batch.id === id);
                    return sum + (b?.greenBeanWeight || 0);
                }, 0);

                const priceUSD = data.currency === 'USD' ? data.pricePerKg : data.pricePerKg / p.exchangeRateUGXtoUSD;

                return {
                    ...p,
                    hulledBatches: newHulledBatches,
                    sales: [
                        ...p.sales,
                        {
                            ...data,
                            id: crypto.randomUUID(),
                            totalSaleAmountUSD: totalWeight * priceUSD,
                            hulledBatchIds: soldBatchIds,
                            items: undefined // Clean up temp field
                        }
                    ]
                };
            });
        case 'TRANSFER_STOCK': {
            const { sourceProjectId, targetProjectId, batchId, weight, date } = action.payload;
            const sourceProject = state.projects.find(p => p.id === sourceProjectId);
            const sourceBatch = sourceProject?.hulledBatches.find(b => b.id === batchId);

            if (!sourceProject || !sourceBatch) return state;

            let unitCostUSD = sourceBatch.costBasisUSD || 0;
            if (!unitCostUSD) {
                const traceability = getBatchProvenance(sourceBatch, sourceProject, state.farmers);
                let totalCostAttributed = 0;
                let totalWeightAttributed = 0;
                traceability.forEach(entry => {
                    const delivery = sourceProject.deliveries.find(d => d.farmerId === entry.farmerId);
                    if (delivery) {
                        const costPerKgCherry = delivery.costUSD / delivery.weight;
                        const cherryNeededForGreen = entry.weightContributedKg * sourceProject.estShrinkFactor;
                        totalCostAttributed += cherryNeededForGreen * costPerKgCherry;
                        totalWeightAttributed += entry.weightContributedKg;
                    }
                });
                const totalSetupCosts = sourceProject.setupCosts.reduce((s, c) => s + c.amountUSD, 0);
                const setupCostPerKg = totalSetupCosts / (sourceProject.requiredGreenBeanMassKg || 1);

                if (totalWeightAttributed > 0) {
                    unitCostUSD = (totalCostAttributed / totalWeightAttributed) + setupCostPerKg;
                } else {
                    const totalDeliveryCost = sourceProject.deliveries.reduce((s, d) => s + d.costUSD, 0);
                    unitCostUSD = (totalDeliveryCost + totalSetupCosts) / sourceProject.requiredGreenBeanMassKg;
                }
            }

            const traceabilitySnapshot = getBatchProvenance(sourceBatch, sourceProject, state.farmers).map(e => ({
                farmerId: e.farmerId,
                weightKg: e.weightContributedKg * (weight / sourceBatch.greenBeanWeight)
            }));

            const updatedProjects = state.projects.map(p => {
                if (p.id === sourceProjectId) {
                    return {
                        ...p,
                        hulledBatches: p.hulledBatches.map(b => {
                            if (b.id === batchId) {
                                const remainingWeight = b.greenBeanWeight - weight;
                                const ratio = remainingWeight / b.greenBeanWeight;
                                return { ...b, greenBeanWeight: remainingWeight, bagCount: b.bagCount ? Math.floor(b.bagCount * ratio) : undefined };
                            }
                            return b;
                        })
                    };
                }
                if (p.id === targetProjectId) {
                    const newHulledBatch: HulledBatch = {
                        id: crypto.randomUUID(), storedBatchId: '', deliveryId: sourceBatch.deliveryId, hullingDate: date,
                        initialCherryWeight: 0, greenBeanWeight: weight, cuppingScore2: sourceBatch.cuppingScore2,
                        warehouseLocation: sourceBatch.warehouseLocation, palletLevel: 'A', bagWeightKg: sourceBatch.bagWeightKg,
                        bagCount: sourceBatch.bagCount ? Math.floor(sourceBatch.bagCount * (weight / sourceBatch.greenBeanWeight)) : undefined,
                        isTransfer: true, sourceProjectId: sourceProjectId, costBasisUSD: unitCostUSD, traceabilitySnapshot: traceabilitySnapshot
                    };
                    return { ...p, hulledBatches: [...p.hulledBatches, newHulledBatch] };
                }
                return p;
            });
            return { ...state, projects: updatedProjects };
        }
        default: return state;
    }
};

const applyDateUpdate = (project: Project, type: ActivityLogEntryType, id: string, newDate: string): Project => {
    switch (type) {
        case 'setup_cost':
            return { ...project, setupCosts: (project.setupCosts || []).map(x => x.id === id ? { ...x, date: newDate } : x) };
        case 'financing':
            return { ...project, financing: (project.financing || []).map(x => x.id === id ? { ...x, date: newDate } : x) };
        case 'advance':
            return { ...project, advances: (project.advances || []).map(x => x.id === id ? { ...x, date: newDate } : x) };
        case 'delivery':
            return { ...project, deliveries: (project.deliveries || []).map(x => x.id === id ? { ...x, date: newDate } : x) };
        case 'drying_start':
            return { ...project, dryingBatches: (project.dryingBatches || []).map(x => x.id === id ? { ...x, startDate: newDate } : x) };
        case 'moisture_measurement':
            return {
                ...project,
                dryingBatches: (project.dryingBatches || []).map(db => ({
                    ...db,
                    moistureMeasurements: (db.moistureMeasurements || []).map(m => m.id === id ? { ...m, date: newDate } : m)
                }))
            };
        case 'storage':
            return { ...project, storedBatches: (project.storedBatches || []).map(x => x.id === id ? { ...x, storageDate: newDate } : x) };
        case 'hulling_start':
            return { ...project, hullingBatches: (project.hullingBatches || []).map(x => x.id === id ? { ...x, startDate: newDate } : x) };
        case 'hulling_complete':
        case 'transfer_in':
            return { ...project, hulledBatches: (project.hulledBatches || []).map(x => x.id === id ? { ...x, hullingDate: newDate } : x) };
        case 'sale':
            return { ...project, sales: (project.sales || []).map(x => x.id === id ? { ...x, invoiceDate: newDate } : x) };
        default:
            return project;
    }
};

const handleMaintenance = (state: ProjectState, action: ProjectAction): ProjectState => {
    switch (action.type) {
        case 'UPDATE_ENTRY_DATE': {
            const { projectId, type, id, newDate } = action.payload;
            return updateProjectInState(state, projectId, p => applyDateUpdate(p, type, id, newDate));
        }
        case 'BULK_UPDATE_ENTRY_DATES': {
            const { updates } = action.payload;
            return {
                ...state,
                projects: state.projects.map(project => {
                    const projectUpdates = updates.filter(u => u.projectId === project.id);
                    if (projectUpdates.length === 0) return project;

                    let updatedProject = project;
                    for (const update of projectUpdates) {
                        updatedProject = applyDateUpdate(updatedProject, update.type, update.id, update.newDate);
                    }
                    return updatedProject;
                })
            };
        }
        case 'RECALCULATE_USD_VALUES':
            const updatedProjects = state.projects.map((p, index) => {
                let up = { ...p };
                const rate = p.exchangeRateUGXtoUSD;
                up.setupCosts = up.setupCosts.map(sc => ({ ...sc, amountUSD: sc.currency === 'USD' ? sc.amount : sc.amount / rate }));
                up.advances = up.advances.map(a => ({ ...a, amountUSD: a.currency === 'USD' ? a.amount : a.amount / rate }));
                up.deliveries = up.deliveries.map(d => ({ ...d, costUSD: d.currency === 'USD' ? d.cost : d.cost / rate }));
                action.payload.progressCallback(((index + 1) / state.projects.length) * 100);
                return up;
            });
            return { ...state, projects: updatedProjects };
        default: return state;
    }
};

export const projectReducer = (state: ProjectState, action: AppProjectAction | any): ProjectState => {
    let newState = handleProjectManagement(state, action);
    if (newState !== state) return newState;

    newState = handleSettings(state, action);
    if (newState !== state) return newState;

    newState = handleFinance(state, action);
    if (newState !== state) return newState;

    newState = handleOperations(state, action);
    if (newState !== state) return newState;

    if (action.type === 'CLOSE_CONTAINER') {
        return {
            ...state,
            containers: state.containers.map(c => c.id === action.payload.containerId ? { ...c, status: 'IN_USE' } : c)
        };
    }

    newState = handleMaintenance(state, action);
    return newState;
};