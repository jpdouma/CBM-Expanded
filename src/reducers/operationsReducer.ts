// ==> src/reducers/operationsReducer.ts <==
import type { ProjectState, Project, ProcessingBatch, ProcessingStage } from '../types';
import { getWeek } from '../utils/formatters';
import { getRecalculatedDryingBeds } from '../utils/projectHelpers';

const updateProjectInState = (state: ProjectState, projectId: string, updateFn: (project: Project) => Project): ProjectState => {
    return {
        ...state,
        projects: state.projects.map(p => (p.id === projectId ? updateFn(p) : p)),
    };
};

export const operationsReducer = (state: ProjectState, action: any): ProjectState => {
    switch (action.type) {
        case 'ASSIGN_CONTAINERS': {
            const { deliveryId, containerIds, projectId } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            const delivery = project?.deliveries.find(d => d.id === deliveryId);
            if (!delivery) return state;
            let updatedContainers = [...(state.containers || [])];

            const alreadyAssigned = updatedContainers.flatMap(c => c.contributions).filter(c => c.deliveryId === deliveryId).reduce((sum, c) => sum + c.weight, 0);
            let remainingToAssign = delivery.weight - alreadyAssigned;

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
                            status: 'IN_USE',
                            currentProjectId: projectId // SPRINT 1.4: Strict Project Isolation
                        };
                        remainingToAssign -= toAdd;
                    }
                }
            });

            return { ...state, containers: updatedContainers };
        }
        case 'INITIALIZE_BATCH': {
            const { projectId, containerIds, initialStage, dryingBedId, floatingTankId, startDate } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            if (containerIds.length === 0) {
                alert("Please select at least 1 container to start a batch.");
                return state;
            }

            const containersToLoad = (state.containers || []).filter(c => containerIds.includes(c.id));
            const totalWeight = containersToLoad.reduce((sum, c) => sum + c.weight, 0);

            const traceabilitySnapshot: { farmerId: string, weightKg: number }[] = [];
            containersToLoad.forEach(c => {
                c.contributions.forEach(contrib => {
                    const existing = traceabilitySnapshot.find(t => t.farmerId === contrib.farmerId);
                    if (existing) existing.weightKg += contrib.weight;
                    else traceabilitySnapshot.push({ farmerId: contrib.farmerId, weightKg: contrib.weight });
                });
            });
            const updatedContainers = (state.containers || []).map(c =>
                containerIds.includes(c.id)
                    ? { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const, currentProjectId: undefined } // SPRINT 1.4: Reset Ownership
                    : c
            );
            // Phase 2: Re-written newBatchId logic for Wet Mill Physics
            const d = new Date(startDate);
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            const mmdd = `${month}${day}`;

            let tankName = 'BASIN';
            if (initialStage === 'FLOATING' && floatingTankId) {
                const tank = (state.floatingTanks || []).find(t => t.id === floatingTankId);
                if (tank) {
                    tankName = tank.name.toUpperCase().replace(/\s+/g, '');
                }
            }

            const totalWeightRounded = Math.round(totalWeight);
            const newBatchId = `${tankName}-${mmdd}-${totalWeightRounded}kg`;

            const newBatch: ProcessingBatch = {
                id: newBatchId,
                projectId: project.id,
                containerIds,
                sinkerContainerIds: [],
                floaterContainerIds: [],
                dryingBedId: initialStage === 'DESICCATION' ? dryingBedId : undefined,
                floatingTankId: initialStage === 'FLOATING' ? floatingTankId : undefined,
                currentStage: initialStage,
                status: 'IN_PROGRESS',
                weight: totalWeight,
                moistureLogs: [],
                traceabilitySnapshot,
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
        case 'LOG_FLOATING_CONTAINER': {
            const { projectId, batchId, containerId, netWeight, type } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;
            const batch = (project.processingBatches || []).find(b => b.id === batchId);
            if (!batch) return state;

            const originalBatchWeight = batch.weight;
            const originalSnapshot = batch.traceabilitySnapshot || [];
            const farmerRatios = originalBatchWeight > 0
                ? originalSnapshot.map(s => ({ farmerId: s.farmerId, ratio: s.weightKg / originalBatchWeight }))
                : [];

            let updatedContainers = [...(state.containers || [])];
            const cIndex = updatedContainers.findIndex(c => c.id === containerId);
            if (cIndex > -1) {
                const containerContributions = farmerRatios.map(r => ({
                    farmerId: r.farmerId,
                    deliveryId: batchId,
                    weight: r.ratio * netWeight
                }));

                updatedContainers[cIndex] = {
                    ...updatedContainers[cIndex],
                    status: type === 'sinker' ? 'IN_USE' : 'QUARANTINED',
                    weight: netWeight,
                    contributions: containerContributions,
                    currentProjectId: projectId
                };
            }

            const updatedSinkerIds = new Set(batch.sinkerContainerIds || []);
            const updatedFloaterIds = new Set(batch.floaterContainerIds || []);

            if (type === 'sinker') {
                updatedSinkerIds.add(containerId);
                updatedFloaterIds.delete(containerId);
            } else {
                updatedFloaterIds.add(containerId);
                updatedSinkerIds.delete(containerId);
            }

            const updatedBatch = {
                ...batch,
                sinkerContainerIds: Array.from(updatedSinkerIds),
                floaterContainerIds: Array.from(updatedFloaterIds)
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
        case 'COMPLETE_FLOATING': {
            const { projectId, batchId, completedBy, endDate } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;
            const batch = (project.processingBatches || []).find(b => b.id === batchId);
            if (!batch) return state;

            const sinkerContainerIds = batch.sinkerContainerIds || [];
            const floaterContainerIds = batch.floaterContainerIds || [];

            const sinkerWeight = (state.containers || [])
                .filter(c => sinkerContainerIds.includes(c.id))
                .reduce((sum, c) => sum + c.weight, 0);

            const floaterWeight = (state.containers || [])
                .filter(c => floaterContainerIds.includes(c.id))
                .reduce((sum, c) => sum + c.weight, 0);

            const originalBatchWeight = batch.weight;
            const sinkerRatio = originalBatchWeight > 0 ? sinkerWeight / originalBatchWeight : 0;

            const originalSnapshot = batch.traceabilitySnapshot || [];
            const newSinkerSnapshot = originalSnapshot.map(entry => ({
                farmerId: entry.farmerId,
                weightKg: entry.weightKg * sinkerRatio
            }));

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
                    startDate: endDate,
                    endDate,
                    completedBy,
                    weightOut: sinkerWeight,
                    floaterWeight
                });
            }

            const activeStages = project.processingPipeline && project.processingPipeline.length > 0 ?
                project.processingPipeline : (['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'] as ProcessingStage[]);
            const currentIndex = activeStages.indexOf('FLOATING');
            const nextStage = currentIndex < activeStages.length - 1 && currentIndex !== -1 ? activeStages[currentIndex + 1] : 'FLOATING';
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
            const allOldCrateIds = sourceBatches.flatMap(b => b.containerIds);
            let updatedContainers = (state.containers || []).map(c => {
                if (allOldCrateIds.includes(c.id)) {
                    return { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const, currentProjectId: undefined }; // SPRINT 1.4: Reset Ownership
                }
                return c;
            });

            const farmerRatios = totalWeight > 0 ?
                aggregatedSnapshot.map(s => ({ farmerId: s.farmerId, ratio: s.weightKg / totalWeight })) : [];

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

            let remainingWeight = totalWeight;
            newContainerIds.forEach(cid => {
                const cIndex = updatedContainers.findIndex(c => c.id === cid);
                if (cIndex > -1 && remainingWeight > 0) {
                    const space = 48 - (updatedContainers[cIndex].weight || 0);
                    const fillAmount = Math.min(space, remainingWeight);
                    if (fillAmount > 0) {
                        const containerContributions = farmerRatios.map(r => ({
                            farmerId: r.farmerId,
                            deliveryId: newBatchId,
                            weight: r.ratio * fillAmount
                        }));

                        updatedContainers[cIndex] = {
                            ...updatedContainers[cIndex],
                            status: 'IN_USE',
                            weight: (updatedContainers[cIndex].weight || 0) + fillAmount,
                            contributions: [...(updatedContainers[cIndex].contributions || []), ...containerContributions],
                            currentProjectId: projectId // SPRINT 1.4: Assign Ownership
                        };
                        remainingWeight -= fillAmount;
                    }
                }
            });
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
            const { projectId, batchId, stage, stages, weightOut, endDate, isOutsourced, outsourcedCost, completedBy, newBedId } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;
            const batch = (project.processingBatches || []).find(b => b.id === batchId);
            if (!batch) return state;

            const updatedHistory = [...batch.history];
            const stagesArray = stages && stages.length > 0 ? stages : [stage];
            stagesArray.forEach((s: ProcessingStage) => {
                const existingIndex = updatedHistory.findIndex(h => h.stage === s && !h.endDate);
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
                        stage: s,
                        startDate: endDate,
                        endDate,
                        completedBy,
                        weightOut,
                        isOutsourced,
                        outsourcedCost
                    });
                }
            });
            const activeStages = project.processingPipeline && project.processingPipeline.length > 0 ? project.processingPipeline : (['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'] as ProcessingStage[]);
            const lastCompletedStage = stagesArray[stagesArray.length - 1];
            const currentIndex = activeStages.indexOf(lastCompletedStage);
            const nextStage = currentIndex < activeStages.length - 1 && currentIndex !== -1 ? activeStages[currentIndex + 1] : lastCompletedStage;
            if (nextStage !== lastCompletedStage) {
                updatedHistory.push({
                    stage: nextStage,
                    startDate: endDate
                });
            }

            let finalBedId = newBedId || batch.dryingBedId;
            let finalIsLocked = batch.isLocked;

            if (batch.currentStage === 'DESICCATION' && nextStage !== 'DESICCATION') {
                finalBedId = undefined;
                finalIsLocked = false;
            }

            const updatedBatch = {
                ...batch,
                status: nextStage === 'EXPORT_READY' ? 'COMPLETED' as const : 'IN_PROGRESS' as const,
                currentStage: nextStage,
                weight: weightOut ?? batch.weight,
                dryingBedId: finalBedId,
                isLocked: finalIsLocked,
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
            const activeStages = project.processingPipeline && project.processingPipeline.length > 0 ? project.processingPipeline : (['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'] as ProcessingStage[]);
            const lastCompletedStage = updatedHistory.slice().reverse().find(h => h.endDate)?.stage || batch.currentStage;
            const currentIndex = activeStages.indexOf(lastCompletedStage);
            const nextStage = currentIndex < activeStages.length - 1 && currentIndex !== -1 ? activeStages[currentIndex + 1] : lastCompletedStage;
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
                updatedBatch.isLocked = false;
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
        case 'ADD_BATCH_MOISTURE_MEASUREMENT': {
            const { projectId, batchId, data } = action.payload;
            return updateProjectInState(state, projectId, p => ({
                ...p,
                processingBatches: (p.processingBatches || []).map(b => {
                    if (b.id !== batchId) return b;
                    return { ...b, moistureLogs: [...(b.moistureLogs || []), { ...data, id: crypto.randomUUID() }] };
                })
            }));
        }
        case 'UPDATE_BATCH_CUPPING_SCORE':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                processingBatches: (p.processingBatches || []).map(b =>
                    b.id === action.payload.batchId
                        ? { ...b, cuppingScore: action.payload.score }
                        : b
                )
            }));
        case 'LOAD_DRYING_BED': {
            const { projectId, containerIds, dryingBedId, startDate, completedBy } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const containersToLoad = (state.containers || []).filter(c => containerIds.includes(c.id));
            const addedWeight = containersToLoad.reduce((sum, c) => sum + c.weight, 0);

            const targetBed = state.dryingBeds.find(b => b.id === dryingBedId);
            if (targetBed) {
                const activeBedBatches = project.processingBatches.filter(b => b.currentStage === 'DESICCATION' && b.dryingBedId === dryingBedId && b.status !== 'COMPLETED');
                if (activeBedBatches.some(b => b.isLocked)) {
                    console.warn(`LOAD_DRYING_BED rejected: Bed ${targetBed.uniqueNumber} is locked.`);
                    return state;
                }

                const currentBedLoad = activeBedBatches.reduce((sum, b) => sum + b.weight, 0);
                if (currentBedLoad + addedWeight > targetBed.capacityKg + 10) {
                    console.warn(`LOAD_DRYING_BED rejected: Exceeds capacity of bed ${targetBed.uniqueNumber}`);
                    return state;
                }
            }

            const newTraceability: { farmerId: string, weightKg: number }[] = [];
            containersToLoad.forEach(c => {
                c.contributions.forEach(contrib => {
                    const existing = newTraceability.find(t => t.farmerId === contrib.farmerId);
                    if (existing) existing.weightKg += contrib.weight;
                    else newTraceability.push({ farmerId: contrib.farmerId, weightKg: contrib.weight });
                });
            });
            const updatedContainers = (state.containers || []).map(c =>
                containerIds.includes(c.id) ? { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const, currentProjectId: undefined } : c
            );
            let updatedBatches = [...project.processingBatches];
            const existingBatchIndex = updatedBatches.findIndex(b => b.currentStage === 'DESICCATION' && b.dryingBedId === dryingBedId && b.status !== 'COMPLETED');
            if (existingBatchIndex !== -1) {
                const existingBatch = updatedBatches[existingBatchIndex];
                const mergedSnapshot = [...(existingBatch.traceabilitySnapshot || [])];
                newTraceability.forEach(nt => {
                    const existing = mergedSnapshot.find(s => s.farmerId === nt.farmerId);
                    if (existing) existing.weightKg += nt.weightKg;
                    else mergedSnapshot.push(nt);
                });
                updatedBatches[existingBatchIndex] = {
                    ...existingBatch,
                    weight: existingBatch.weight + addedWeight,
                    traceabilitySnapshot: mergedSnapshot
                };
            } else {
                const d = new Date(startDate);
                const newBatchId = `${d.getDay() === 0 ? 7 : d.getDay()}-wk${getWeek(d).toString().padStart(2, '0')}${d.getFullYear().toString().slice(-2)}-${targetBed?.uniqueNumber || 'BED'}`;
                updatedBatches.push({
                    id: newBatchId,
                    projectId,
                    containerIds: [],
                    dryingBedId,
                    currentStage: 'DESICCATION',
                    status: 'IN_PROGRESS',
                    weight: addedWeight,
                    moistureLogs: [],
                    traceabilitySnapshot: newTraceability,
                    history: [{ stage: 'DESICCATION', startDate, completedBy }]
                });
            }

            return { ...state, containers: updatedContainers, projects: state.projects.map(p => p.id === projectId ? { ...p, processingBatches: updatedBatches } : p) };
        }
        case 'POUR_BATCH_TO_BED': {
            const { projectId, batchId, dryingBedId, containerIds } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const sourceBatch = project.processingBatches.find(b => b.id === batchId);
            if (!sourceBatch) return state;

            const targetBed = state.dryingBeds.find(b => b.id === dryingBedId);

            const containersToPour = (state.containers || []).filter(c => containerIds.includes(c.id));
            const pouredWeight = containersToPour.reduce((sum, c) => sum + c.weight, 0);

            if (pouredWeight <= 0) return state;

            if (targetBed) {
                const activeBedBatches = project.processingBatches.filter(b => b.currentStage === 'DESICCATION' && b.dryingBedId === dryingBedId && b.status !== 'COMPLETED' && b.id !== batchId);
                if (activeBedBatches.some(b => b.isLocked)) {
                    console.warn(`POUR_BATCH_TO_BED rejected: Bed ${targetBed.uniqueNumber} is locked.`);
                    return state;
                }

                const currentBedLoad = activeBedBatches.reduce((sum, b) => sum + b.weight, 0);
                if (currentBedLoad + pouredWeight > targetBed.capacityKg + 10) {
                    console.warn(`POUR_BATCH_TO_BED rejected: Exceeds capacity of bed ${targetBed.uniqueNumber}`);
                    return state;
                }
            }

            const pouredRatio = pouredWeight / sourceBatch.weight;

            const pouredSnapshot = (sourceBatch.traceabilitySnapshot || []).map(snap => ({
                farmerId: snap.farmerId,
                weightKg: snap.weightKg * pouredRatio
            }));

            const updatedContainers = (state.containers || []).map(c =>
                containerIds.includes(c.id) ? { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const, currentProjectId: undefined } : c // SPRINT 1.4: Reset Ownership
            );

            let updatedBatches = [...project.processingBatches];
            const isFullPour = containerIds.length === (sourceBatch.containerIds || []).length;

            const existingBatchIndex = updatedBatches.findIndex(b => b.currentStage === 'DESICCATION' && b.dryingBedId === dryingBedId && b.status !== 'COMPLETED' && b.id !== batchId);

            if (existingBatchIndex !== -1) {
                // Merge into existing active batch on this bed
                const existingBatch = updatedBatches[existingBatchIndex];
                const mergedSnapshot = [...(existingBatch.traceabilitySnapshot || [])];

                pouredSnapshot.forEach(nt => {
                    const existing = mergedSnapshot.find(s => s.farmerId === nt.farmerId);
                    if (existing) existing.weightKg += nt.weightKg;
                    else mergedSnapshot.push(nt);
                });

                updatedBatches[existingBatchIndex] = {
                    ...existingBatch,
                    weight: existingBatch.weight + pouredWeight,
                    traceabilitySnapshot: mergedSnapshot
                };

                // Handle the parent batch
                if (isFullPour) {
                    // Remove the incoming batch entirely as it's been fully absorbed
                    updatedBatches = updatedBatches.filter(b => b.id !== batchId);
                } else {
                    // Reduce the parent batch
                    updatedBatches = updatedBatches.map(b => {
                        if (b.id === batchId) {
                            return {
                                ...b,
                                weight: b.weight - pouredWeight,
                                containerIds: b.containerIds.filter(id => !containerIds.includes(id)),
                                traceabilitySnapshot: (b.traceabilitySnapshot || []).map(snap => ({
                                    farmerId: snap.farmerId,
                                    weightKg: Math.max(0, snap.weightKg * (1 - pouredRatio))
                                }))
                            };
                        }
                        return b;
                    });
                }
            } else {
                // No existing active batch on this bed.
                if (isFullPour) {
                    // Just update the dryingBedId and clear containerIds
                    updatedBatches = updatedBatches.map(b =>
                        b.id === batchId ? { ...b, dryingBedId, containerIds: [] } : b
                    );
                } else {
                    // Create a new batch for the bed
                    const d = new Date();
                    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                    const weekNum = getWeek(d);
                    const weekStr = weekNum.toString().padStart(2, '0');
                    const year = d.getFullYear().toString().slice(-2);
                    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                    const newBatchId = `${dayOfWeek}-wk${weekStr}${year}-${targetBed?.uniqueNumber || 'BED'}-${randomSuffix}`;

                    updatedBatches.push({
                        ...sourceBatch,
                        id: newBatchId,
                        weight: pouredWeight,
                        containerIds: [],
                        dryingBedId,
                        traceabilitySnapshot: pouredSnapshot
                    });

                    // Reduce the parent batch
                    updatedBatches = updatedBatches.map(b => {
                        if (b.id === batchId) {
                            return {
                                ...b,
                                weight: b.weight - pouredWeight,
                                containerIds: b.containerIds.filter(id => !containerIds.includes(id)),
                                traceabilitySnapshot: (b.traceabilitySnapshot || []).map(snap => ({
                                    farmerId: snap.farmerId,
                                    weightKg: Math.max(0, snap.weightKg * (1 - pouredRatio))
                                }))
                            };
                        }
                        return b;
                    });
                }
            }

            return {
                ...state,
                containers: updatedContainers,
                projects: state.projects.map(p => p.id === projectId ? { ...p, processingBatches: updatedBatches } : p)
            };
        }
        case 'HARVEST_DRYING_BED': {
            const { projectId, batchId, driedWeight, bagCount, endDate, completedBy } = action.payload;
            return updateProjectInState(state, projectId, p => {
                const updatedBatches = p.processingBatches.map(b => {
                    if (b.id !== batchId) return b;

                    const updatedHistory = [...b.history];
                    const desIndex = updatedHistory.findIndex(h => h.stage === 'DESICCATION' && !h.endDate);
                    if (desIndex !== -1) {
                        updatedHistory[desIndex] = { ...updatedHistory[desIndex], endDate, completedBy, weightOut: driedWeight };
                    }

                    updatedHistory.push({ stage: 'RESTING', startDate: endDate, completedBy });

                    return {
                        ...b,
                        weight: driedWeight,
                        bagCount,
                        bagWeightKg: bagCount > 0 ? driedWeight / bagCount : 70,
                        dryingBedId: undefined,
                        isLocked: false,
                        currentStage: 'RESTING' as const,
                        history: updatedHistory
                    };
                });

                const tempProject = { ...p, processingBatches: updatedBatches };
                const { updatedBedIds } = getRecalculatedDryingBeds(tempProject, state.dryingBeds);

                return {
                    ...tempProject,
                    dryingBedIds: updatedBedIds
                };
            });
        }
        case 'PUT_AWAY_BATCH': {
            const { projectId, batchId, putAwayDate, mainLocation, remainderLocation } = action.payload;
            return updateProjectInState(state, projectId, p => {
                const batchIndex = p.processingBatches.findIndex(b => b.id === batchId);
                if (batchIndex === -1) return p;

                const batch = p.processingBatches[batchIndex];
                const updatedBatches = [...p.processingBatches];

                const remainderWeight = remainderLocation ? batch.weight % 70 : 0;
                const mainWeight = batch.weight - remainderWeight;

                updatedBatches[batchIndex] = {
                    ...batch,
                    weight: mainWeight,
                    putAwayDate,
                    warehouseLocation: mainLocation.facility,
                    storageZone: mainLocation.zone,
                    storageRow: mainLocation.row,
                    palletId: mainLocation.pallet,
                    palletLevel: mainLocation.level
                };

                if (remainderLocation && remainderWeight > 0) {
                    const remnantBatch: ProcessingBatch = {
                        ...batch,
                        id: crypto.randomUUID(),
                        weight: remainderWeight,
                        bagCount: 0,
                        isRemainder: true,
                        putAwayDate,
                        warehouseLocation: remainderLocation.facility,
                        storageZone: remainderLocation.zone,
                        storageRow: remainderLocation.row,
                        palletId: remainderLocation.pallet,
                        palletLevel: remainderLocation.level
                    };
                    updatedBatches.push(remnantBatch);
                }

                return { ...p, processingBatches: updatedBatches };
            });
        }
        case 'TOGGLE_BATCH_LOCK': {
            const { projectId, batchId } = action.payload;
            return updateProjectInState(state, projectId, p => ({
                ...p,
                processingBatches: p.processingBatches.map(b =>
                    b.id === batchId ? { ...b, isLocked: !b.isLocked } : b
                )
            }));
        }
        case 'SPLIT_BATCH': {
            const { projectId, sourceBatchId, splits, stage, stages, endDate, completedBy } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const sourceBatch = project.processingBatches.find(b => b.id === sourceBatchId);
            if (!sourceBatch) return state;

            const parentTotalBatchWeight = sourceBatch.weight;

            // Pipeline Routing
            const activeStages = project.processingPipeline && project.processingPipeline.length > 0
                ? project.processingPipeline
                : (['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'] as ProcessingStage[]);

            // Sprint 7: Determine next stage using stages array
            const stagesArray = stages && stages.length > 0 ? stages : [stage];
            const lastCompletedStage = stagesArray[stagesArray.length - 1];

            const currentIndex = activeStages.indexOf(lastCompletedStage);
            const nextStage = currentIndex < activeStages.length - 1 && currentIndex !== -1
                ? activeStages[currentIndex + 1]
                : lastCompletedStage;

            const newBatches: ProcessingBatch[] = splits.map((split: { grade: string, weight: number }) => {
                const childTraceability = (sourceBatch.traceabilitySnapshot || []).map(snap => ({
                    farmerId: snap.farmerId,
                    weightKg: snap.weightKg * (split.weight / parentTotalBatchWeight)
                }));

                const childHistory = [...sourceBatch.history];

                stagesArray.forEach((s: ProcessingStage) => {
                    const existingIndex = childHistory.findIndex(h => h.stage === s && !h.endDate);
                    if (existingIndex !== -1) {
                        childHistory[existingIndex] = {
                            ...childHistory[existingIndex],
                            endDate,
                            completedBy,
                            weightOut: split.weight
                        };
                    } else {
                        childHistory.push({
                            stage: s,
                            startDate: endDate,
                            endDate,
                            completedBy,
                            weightOut: split.weight
                        });
                    }
                });

                if (nextStage !== lastCompletedStage && !childHistory.some(h => h.stage === nextStage)) {
                    childHistory.push({
                        stage: nextStage,
                        startDate: endDate
                    });
                }

                return {
                    ...sourceBatch,
                    id: `${sourceBatch.id}-${split.grade.replace(/\s+/g, '').toUpperCase()}`,
                    grade: split.grade,
                    weight: split.weight,
                    currentStage: nextStage,
                    status: nextStage === 'EXPORT_READY' ? 'COMPLETED' : 'IN_PROGRESS',
                    history: childHistory,
                    traceabilitySnapshot: childTraceability,
                    // Wipe physical warehouse constraints for the new child batches until put away again
                    isTransfer: false,
                    isRemainder: false,
                    consumedByBatchId: undefined,
                    containerIds: [],
                    warehouseLocation: undefined,
                    storageZone: undefined,
                    storageRow: undefined,
                    palletId: undefined,
                    palletLevel: undefined,
                } as ProcessingBatch;
            });

            const updatedBatches = project.processingBatches.map(b => {
                if (b.id === sourceBatchId) {
                    const parentHistory = [...b.history];

                    stagesArray.forEach((s: ProcessingStage) => {
                        const pExistingIndex = parentHistory.findIndex(h => h.stage === s && !h.endDate);
                        if (pExistingIndex !== -1) {
                            parentHistory[pExistingIndex] = { ...parentHistory[pExistingIndex], endDate, completedBy };
                        } else {
                            parentHistory.push({ stage: s, startDate: endDate, endDate, completedBy });
                        }
                    });

                    return {
                        ...b,
                        status: 'COMPLETED' as const,
                        consumedByBatchId: 'SPLIT',
                        history: parentHistory
                    };
                }
                return b;
            });

            return {
                ...state,
                projects: state.projects.map(p => p.id === projectId ? { ...p, processingBatches: [...updatedBatches, ...newBatches] } : p)
            };
        }
        case 'ADD_SALE': {
            const { projectId, data } = action.payload;
            return updateProjectInState(state, projectId, p => {
                const newProcessingBatches = [...(p.processingBatches || [])];
                const soldBatchIds: string[] = [];

                if (data.items) {
                    data.items.forEach((item: { batchId: string, bags: number }) => {
                        const batchIndex = newProcessingBatches.findIndex(b => b.id === item.batchId);
                        if (batchIndex === -1) return;

                        const batch = newProcessingBatches[batchIndex];
                        const weightToDeduct = item.bags * (batch.bagWeightKg || 70);

                        const newWeight = Math.max(0, batch.weight - weightToDeduct);
                        const newBagCount = Math.max(0, (batch.bagCount || 0) - item.bags);

                        newProcessingBatches[batchIndex] = {
                            ...batch,
                            weight: newWeight,
                            bagCount: newBagCount,
                            status: newWeight <= 0 ? 'COMPLETED' : batch.status
                        };
                        soldBatchIds.push(batch.id);
                    });
                }

                const priceUSD = data.currency === 'USD' ? data.pricePerKg : data.pricePerKg / p.exchangeRateUGXtoUSD;
                const totalWeightSold = data.items?.reduce((sum: number, item: any) => sum + (item.bags * 70), 0) || 0;
                const totalSaleAmountUSD = data.totalSaleAmountUSD || (totalWeightSold * priceUSD);

                const newSale = {
                    ...data,
                    id: crypto.randomUUID(),
                    processingBatchIds: Array.from(new Set(soldBatchIds)),
                    totalSaleAmountUSD
                };

                delete (newSale as any).items;
                return {
                    ...p,
                    processingBatches: newProcessingBatches,
                    sales: [...(p.sales || []), newSale as any]
                };
            });
        }
        case 'TRANSFER_STOCK': {
            const { sourceProjectId, targetProjectId, batchId, weight, date } = action.payload;
            const sourceProject = state.projects.find(p => p.id === sourceProjectId);
            const sourceBatch = sourceProject?.processingBatches.find(b => b.id === batchId);
            if (!sourceProject || !sourceBatch) return state;

            const updatedProjects = state.projects.map(p => {
                if (p.id === sourceProjectId) {
                    return {
                        ...p,
                        processingBatches: p.processingBatches.map(b => {
                            if (b.id === batchId) {
                                const remainingWeight = b.weight - weight;
                                const ratio = remainingWeight / b.weight;
                                return {
                                    ...b,
                                    weight: remainingWeight,
                                    bagCount: b.bagCount ? Math.floor(b.bagCount * ratio) : undefined,
                                    status: remainingWeight <= 0 ? 'COMPLETED' : b.status
                                };
                            }
                            return b;
                        })
                    };
                }
                if (p.id === targetProjectId) {
                    const newTransferBatch: ProcessingBatch = {
                        id: crypto.randomUUID(),
                        projectId: targetProjectId,
                        containerIds: [],
                        currentStage: 'EXPORT_READY',
                        status: 'COMPLETED',
                        weight: weight,
                        moistureLogs: sourceBatch.moistureLogs || [],
                        cuppingScore: sourceBatch.cuppingScore,
                        warehouseLocation: sourceBatch.warehouseLocation,
                        palletLevel: 'A',
                        bagWeightKg: sourceBatch.bagWeightKg,
                        bagCount: sourceBatch.bagCount ? Math.floor(sourceBatch.bagCount * (weight / sourceBatch.weight)) : undefined,
                        isTransfer: true,
                        sourceProjectId: sourceProjectId,
                        costBasisUSD: sourceBatch.costBasisUSD,
                        traceabilitySnapshot: [...(sourceBatch.traceabilitySnapshot || [])],
                        history: [{ stage: 'EXPORT_READY', startDate: date, completedBy: 'System Transfer' }]
                    };
                    return { ...p, processingBatches: [...p.processingBatches, newTransferBatch] };
                }
                return p;
            });

            return { ...state, projects: updatedProjects };
        }
        case 'WIPE_PROJECT_DATA': {
            const { deliveryIds, batchIds } = action.payload;
            // 1. Clean up containers connected to this project
            const updatedContainers = (state.containers || []).map(container => {
                // Filter out contributions that match the deleted deliveries or batches
                const keptContributions = container.contributions.filter(c =>
                    !deliveryIds.includes(c.deliveryId) && !batchIds.includes(c.deliveryId)
                );

                // If contributions changed, recalculate weight
                if (keptContributions.length !== container.contributions.length) {
                    const newWeight = keptContributions.reduce((sum, c) => sum + c.weight, 0);
                    return {
                        ...container,
                        contributions: keptContributions,
                        weight: newWeight,
                        status: (newWeight > 0 ? 'IN_USE' : 'AVAILABLE') as 'IN_USE' | 'AVAILABLE',
                        currentProjectId: newWeight > 0 ? container.currentProjectId : undefined // SPRINT 1.4: Reset Ownership
                    };
                }
                return container;
            });
            return { ...state, containers: updatedContainers };
        }
        case 'DELETE_PROJECT': {
            const { projectId } = action.payload;
            const projectToDelete = state.projects.find(p => p.id === projectId);
            if (!projectToDelete) return state;

            const deliveryIds = (projectToDelete.deliveries || []).map(d => d.id);
            const batchIds = (projectToDelete.processingBatches || []).map(b => b.id);
            const idsToRemove = new Set([...deliveryIds, ...batchIds]);

            const updatedContainers = (state.containers || []).map(container => {
                const keptContributions = container.contributions.filter(c => !idsToRemove.has(c.deliveryId));
                if (keptContributions.length !== container.contributions.length) {
                    const newWeight = keptContributions.reduce((sum, c) => sum + c.weight, 0);
                    return {
                        ...container,
                        contributions: keptContributions,
                        weight: newWeight,
                        status: (newWeight > 0 ? 'IN_USE' : 'AVAILABLE') as 'IN_USE' | 'AVAILABLE',
                        currentProjectId: newWeight > 0 ? container.currentProjectId : undefined // SPRINT 1.4: Reset Ownership
                    };
                }
                return container;
            });

            return { ...state, containers: updatedContainers };
        }
        case 'FORCE_EMPTY_CONTAINERS': {
            const { containerIds } = action.payload;
            const updatedContainers = (state.containers || []).map(c =>
                containerIds.includes(c.id)
                    ? { ...c, weight: 0, contributions: [], status: 'AVAILABLE' as const, currentProjectId: undefined } // SPRINT 1.4: Reset Ownership
                    : c
            );
            return { ...state, containers: updatedContainers };
        }
        default:
            return state;
    }
};