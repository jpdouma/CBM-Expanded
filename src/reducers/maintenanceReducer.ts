// ==> src/reducers/maintenanceReducer.ts <==
import type { ProjectState, ProjectAction, Project, ActivityLogEntryType } from '../types';

const updateProjectInState = (state: ProjectState, projectId: string, updateFn: (project: Project) => Project): ProjectState => {
    return {
        ...state,
        projects: state.projects.map(p => (p.id === projectId ? updateFn(p) : p)),
    };
};

const applyDateUpdate = (project: Project, type: ActivityLogEntryType, id: string, newDate: string): Project => {
    switch (type) {
        case 'setup_cost': return { ...project, setupCosts: (project.setupCosts || []).map(x => x.id === id ? { ...x, date: newDate } : x) };
        case 'financing': return { ...project, financing: (project.financing || []).map(x => x.id === id ? { ...x, date: newDate } : x) };
        case 'advance': return { ...project, advances: (project.advances || []).map(x => x.id === id ? { ...x, date: newDate } : x) };
        case 'delivery': return { ...project, deliveries: (project.deliveries || []).map(x => x.id === id ? { ...x, date: newDate } : x) };
        case 'sale': return { ...project, sales: (project.sales || []).map(x => x.id === id ? { ...x, invoiceDate: newDate } : x) };
        case 'processing_step': {
            const [batchId, stepIdxStr, startOrEnd] = id.split('|');
            const stepIdx = parseInt(stepIdxStr, 10);
            return {
                ...project,
                processingBatches: (project.processingBatches || []).map(b => {
                    if (b.id === batchId && b.history[stepIdx]) {
                        const newHistory = [...b.history];
                        if (startOrEnd === 'start') newHistory[stepIdx] = { ...newHistory[stepIdx], startDate: newDate };
                        if (startOrEnd === 'end') newHistory[stepIdx] = { ...newHistory[stepIdx], endDate: newDate };
                        return { ...b, history: newHistory };
                    }
                    return b;
                })
            };
        }
        default: return project;
    }
};

export const maintenanceReducer = (state: ProjectState, action: any): ProjectState => {
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
                    const projectUpdates = updates.filter((u: any) => u.projectId === project.id);
                    if (projectUpdates.length === 0) return project;
                    let updatedProject = project;
                    for (const update of projectUpdates) {
                        updatedProject = applyDateUpdate(updatedProject, update.type, update.id, update.newDate);
                    }
                    return updatedProject;
                })
            };
        }
        case 'DELETE_LOG_ENTRY': {
            const { projectId, type, id } = action.payload;
            let updatedContainers = state.containers || [];

            const newState = updateProjectInState(state, projectId, p => {
                let updatedProject = { ...p };
                switch (type) {
                    case 'setup_cost': updatedProject.setupCosts = (p.setupCosts || []).filter(x => x.id !== id); break;
                    case 'advance': updatedProject.advances = (p.advances || []).filter(x => x.id !== id); break;
                    case 'delivery': updatedProject.deliveries = (p.deliveries || []).filter(x => x.id !== id); break;
                    case 'financing': updatedProject.financing = (p.financing || []).filter(x => x.id !== id); break;
                    case 'sale': updatedProject.sales = (p.sales || []).filter(x => x.id !== id); break;
                    case 'processing_step': {
                        const batchId = id.split('|')[0];
                        const batchToDelete = (p.processingBatches || []).find(b => b.id === batchId);

                        if (batchToDelete && batchToDelete.containerIds) {
                            updatedContainers = updatedContainers.map(c =>
                                batchToDelete.containerIds.includes(c.id)
                                    ? { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const }
                                    : c
                            );
                        }

                        updatedProject.processingBatches = (p.processingBatches || []).filter(b => b.id !== batchId);
                        break;
                    }
                }
                return updatedProject;
            });
            return { ...newState, containers: updatedContainers };
        }
        case 'RECALCULATE_USD_VALUES': {
            const updatedProjects = state.projects.map((p, index) => {
                let up = { ...p };
                const rate = p.exchangeRateUGXtoUSD || 3750;
                up.setupCosts = (up.setupCosts || []).map(sc => ({ ...sc, amountUSD: sc.currency === 'USD' ? sc.amount : sc.amount / rate }));
                up.advances = (up.advances || []).map(a => ({ ...a, amountUSD: a.currency === 'USD' ? a.amount : a.amount / rate }));
                up.deliveries = (up.deliveries || []).map(d => ({ ...d, costUSD: d.currency === 'USD' ? d.cost : d.cost / rate }));
                if (action.payload.progressCallback) {
                    action.payload.progressCallback(((index + 1) / state.projects.length) * 100);
                }
                return up;
            });
            return { ...state, projects: updatedProjects };
        }
        default:
            return state;
    }
};