// ==> src/hooks/useProcessingWorkflow.ts <==
import { useState, useMemo } from 'react';
import type { Project, ProcessingStage } from '../types';
import { useProjects } from '../context/ProjectProvider';

export const useProcessingWorkflow = (project: Project) => {
    const { state, dispatch } = useProjects();
    const { storageLocations, farmers, containers = [] } = state;

    // --- 1. Derived Data (Selectors) based on unified ProcessingBatch ---

    // Deliveries not yet fully assigned to physical crates
    const unassignedDeliveries = useMemo(() => {
        return (project.deliveries || []).filter(d => {
            const assignedWeight = containers
                .flatMap(c => c.contributions)
                .filter(c => c.deliveryId === d.id)
                .reduce((sum, c) => sum + c.weight, 0);
            return d.weight - assignedWeight > 0;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [project.deliveries, containers]);

    const getBatchesByStage = (stage: ProcessingStage) => {
        return (project.processingBatches || []).filter(b =>
            b.currentStage === stage && b.status !== 'COMPLETED'
        ).sort((a, b) => {
            const dateA = a.history[a.history.length - 1]?.startDate || new Date().toISOString();
            const dateB = b.history[b.history.length - 1]?.startDate || new Date().toISOString();
            return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
    };

    const activeDryingBatches = useMemo(() => getBatchesByStage('DESICCATION'), [project.processingBatches]);
    const restingBatches = useMemo(() => getBatchesByStage('RESTING'), [project.processingBatches]);
    const activeHullingBatches = useMemo(() => getBatchesByStage('HULLING'), [project.processingBatches]);
    const exportReadyBatches = useMemo(() => getBatchesByStage('EXPORT_READY'), [project.processingBatches]);

    const availableRemainders = useMemo(() =>
        (project.processingBatches || []).filter(b =>
            b.isRemainder && !b.consumedByBatchId && b.currentStage === 'EXPORT_READY' &&
            !(project.sales || []).some(s => s.processingBatchIds.includes(b.id))
        ), [project.processingBatches, project.sales]);

    // --- 2. Local State & Helpers ---

    const [activeMoistureBatchId, setActiveMoistureBatchId] = useState<string | null>(null);

    const getAggregatedLocationConfig = (locationName: string) => {
        const matchingLocs = storageLocations.filter(l => l.name === locationName);
        if (matchingLocs.length === 0) return undefined;
        return {
            name: locationName,
            facilityCode: matchingLocs[0].facilityCode,
            allowedZones: Array.from(new Set(matchingLocs.flatMap(l => l.allowedZones))).sort(),
        };
    };

    const uniqueLocationNames = useMemo(() => Array.from(new Set(storageLocations.map(l => l.name))).sort(), [storageLocations]);

    const isMoistureValid = (percentage: number | null | undefined) => {
        if (percentage === null || percentage === undefined || isNaN(percentage)) return false;
        const target = project.targetMoisturePercentage ?? 11.5;
        return Math.abs(percentage - target) <= 0.5;
    };

    const handleLogMoisture = (batchId: string, percentage: number, date: string = new Date().toISOString().split('T')[0]) => {
        dispatch({
            type: 'ADD_BATCH_MOISTURE_MEASUREMENT',
            payload: {
                projectId: project.id,
                batchId,
                data: { date, percentage }
            }
        });
    };

    return {
        // Data
        unassignedDeliveries,
        activeDryingBatches,
        restingBatches,
        activeHullingBatches,
        exportReadyBatches,
        availableRemainders,
        farmers,
        uniqueLocationNames,

        // Helpers
        getAggregatedLocationConfig,
        isMoistureValid,

        // Actions
        handleLogMoisture,
        activeMoistureBatchId,
        setActiveMoistureBatchId
    };
};