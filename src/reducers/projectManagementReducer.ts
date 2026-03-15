// ==> src/reducers/projectManagementReducer.ts <==
import type { ProjectState, ProjectAction, Project, ProcessingStage } from '../types';
import { createNewProject, getRecalculatedDryingBeds } from '../utils/projectHelpers';
import { processImportedData } from '../utils/migrations';

const updateProjectInState = (state: ProjectState, projectId: string, updateFn: (project: Project) => Project): ProjectState => {
    return {
        ...state,
        projects: state.projects.map(p => (p.id === projectId ? updateFn(p) : p)),
    };
};

export const projectManagementReducer = (state: ProjectState, action: any): ProjectState => {
    switch (action.type) {
        case 'LOAD_STATE': {
            const payload = action.payload || {};
            return {
                ...state,
                ...payload,
                projects: (payload.projects || state.projects || []).map((p: any) => ({
                    ...p,
                    processingPipeline: p.processingPipeline || ['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'],
                    processingBatches: p.processingBatches || [],
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
            // Sprint 6: Extract methodId and methodLabel from payload
            const { name, methodId, methodLabel, id } = action.payload;
            let determinedPipeline: ProcessingStage[] = ['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'];

            if (state.processingMethods) {
                // Look up the selected method dynamically
                const method = state.processingMethods.find(m => m.id === methodId);
                if (method && method.pipeline && method.pipeline.length > 0) {
                    determinedPipeline = method.pipeline;
                }
            }

            // Create project with the selected methodId, dynamic pipeline, and the chosen label alias
            const newProject = createNewProject(name, methodId, determinedPipeline, methodLabel);
            if (id) newProject.id = id;

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

            if ('estCostPerKgCherry' in updates || 'estCostPerKgCherryCurrency' in updates || 'exchangeRateUGXtoUSD' in updates || 'exchangeRateEURtoUSD' in updates) {
                const amount = updatedProject.estCostPerKgCherry || 0;
                const currency = updatedProject.estCostPerKgCherryCurrency || 'USD';
                let rate = 1;

                if (currency === 'UGX') rate = updatedProject.exchangeRateUGXtoUSD || 3750;
                if (currency === 'EUR') rate = updatedProject.exchangeRateEURtoUSD || 0.92;

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
                processingPipeline: p.processingPipeline || ['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'],
                processingBatches: p.processingBatches || [],
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

        case 'WIPE_PROJECT_DATA': {
            const { projectId } = action.payload;
            return updateProjectInState(state, projectId, p => ({
                ...p,
                deliveries: [],
                advances: [],
                processingBatches: [],
                sales: [],
                financing: [],
                setupCosts: [],
                preProjectChecklist: {
                    ...p.preProjectChecklist,
                    projectStarted: false,
                    forecastGenerated: false,
                    firstWithdrawalReceived: false
                }
            }));
        }

        default: return state;
    }
};