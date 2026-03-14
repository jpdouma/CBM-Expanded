// ==> src/hooks/useOperationalMetrics.ts <==
import { useMemo } from 'react';
import type { Project, ClientDetails, Farmer } from '../types';
import { getWeek, dayDiff } from '../utils/formatters';

export const useOperationalMetrics = (
    filteredProjects: Project[],
    allClients: ClientDetails[],
    allFarmers: Farmer[],
    startDate: string,
    endDate: string
) => {
    const metrics = useMemo(() => {
        if (filteredProjects.length === 0) return null;

        let totalCherryDelivered = 0;
        let totalCurrentlyDrying = 0;
        let totalInStorage = 0;
        let totalGreenBeanHulled = 0;
        let totalGreenBeanSold = 0;
        let totalRequiredGreenBeanMass = 0;

        const processingTimes: number[] = [];
        const actualShrinkFactors: number[] = [];
        const cuppingScores: number[] = [];
        const farmerDeliveries: Record<string, number> = {};
        let totalEstShrinkFactor = 0;

        const farmerNameMap = new Map<string, string>();
        allFarmers.forEach(f => farmerNameMap.set(f.id, f.name));
        // Add fallback for legacy local farmers
        filteredProjects.forEach(p => (p.farmers || []).forEach(f => {
            if (!farmerNameMap.has(f.id)) farmerNameMap.set(f.id, f.name);
        }));

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        const allProjectDeliveries = filteredProjects.flatMap(p => p.deliveries || []);

        const deliveriesInDateRange = allProjectDeliveries.filter(d => {
            const deliveryDate = new Date(d.date);
            return deliveryDate >= start && deliveryDate <= end;
        });
        const weeklyDeliveriesMap = new Map<string, number>();
        deliveriesInDateRange.forEach(d => {
            const deliveryDate = new Date(d.date);
            const year = deliveryDate.getUTCFullYear();
            const week = getWeek(deliveryDate);
            const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
            weeklyDeliveriesMap.set(weekKey, (weeklyDeliveriesMap.get(weekKey) || 0) + d.weight);
        });

        const allWeeksInRange = new Map<string, number>();
        if (start <= end) {
            let current = new Date(start);
            while (current <= end) {
                const year = current.getUTCFullYear();
                const week = getWeek(current);
                const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
                if (!allWeeksInRange.has(weekKey)) {
                    allWeeksInRange.set(weekKey, 0);
                }
                current.setDate(current.getDate() + 7);
            }
        }

        const combinedWeeksMap = new Map([...allWeeksInRange, ...weeklyDeliveriesMap]);
        const sortedWeeks = Array.from(combinedWeeksMap.keys()).sort();

        let cumulativeWeightInRange = 0;
        const deliveryChartData = sortedWeeks.map(weekKey => {
            const weight = combinedWeeksMap.get(weekKey) || 0;
            cumulativeWeightInRange += weight;
            return {
                week: weekKey.replace('-W', ' W'),
                weight,
                cumulativeWeight: cumulativeWeightInRange
            };
        });

        filteredProjects.forEach(p => {
            totalRequiredGreenBeanMass += p.requiredGreenBeanMassKg || 0;
            totalEstShrinkFactor += p.estShrinkFactor || 6.25;

            // 1. Process Deliveries
            (p.deliveries || []).forEach(d => {
                totalCherryDelivered += d.weight;
                farmerDeliveries[d.farmerId] = (farmerDeliveries[d.farmerId] || 0) + d.weight;
            });

            // 2. Process Unified Batches
            (p.processingBatches || []).forEach(batch => {
                // Currently Drying
                if (batch.currentStage === 'DESICCATION' && batch.status !== 'COMPLETED') {
                    totalCurrentlyDrying += batch.weight;
                }

                // Currently Resting (Storage)
                if (batch.currentStage === 'RESTING' && batch.status !== 'COMPLETED') {
                    totalInStorage += batch.weight;
                }

                // Export Ready (Hulled/Graded Green Bean)
                const hasReachedExportReady = batch.history.some(h => h.stage === 'EXPORT_READY');
                if (hasReachedExportReady || batch.currentStage === 'EXPORT_READY') {
                    totalGreenBeanHulled += batch.weight;

                    if (batch.cuppingScore) {
                        cuppingScores.push(batch.cuppingScore);
                    }

                    // Calculate Shrink Factor based on traceability snapshot (Initial Cherry Weight) vs Current Weight
                    const initialCherryWeight = (batch.traceabilitySnapshot || []).reduce((sum, snap) => sum + snap.weightKg, 0);
                    if (initialCherryWeight > 0 && batch.weight > 0 && !batch.isRemainder && !batch.isTransfer) {
                        actualShrinkFactors.push(initialCherryWeight / batch.weight);
                    }

                    // Calculate Processing Time
                    const receptionStep = batch.history.find(h => h.stage === 'RECEPTION' || h.stage === 'FLOATING');
                    const exportReadyStep = batch.history.find(h => h.stage === 'EXPORT_READY');
                    if (receptionStep && exportReadyStep && exportReadyStep.startDate) {
                        processingTimes.push(dayDiff(new Date(receptionStep.startDate), new Date(exportReadyStep.startDate)));
                    }
                }
            });

            // 3. Process Sales (reading from processingBatches)
            const soldBatchIds = new Set((p.sales || []).flatMap(s => s.processingBatchIds || []));
            soldBatchIds.forEach(batchId => {
                const batch = (p.processingBatches || []).find(b => b.id === batchId);
                if (batch) {
                    totalGreenBeanSold += batch.weight;
                }
            });
        });

        const topFarmers = Object.entries(farmerDeliveries)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([farmerId, weight]) => ({ id: farmerId, name: farmerNameMap.get(farmerId) || 'Unknown', weight }));

        const projectFulfillment = totalRequiredGreenBeanMass > 0 ? (totalGreenBeanSold / totalRequiredGreenBeanMass) * 100 : 0;
        const avgGreenBeanQuality = cuppingScores.length > 0 ? cuppingScores.reduce((a, b) => a + b, 0) / cuppingScores.length : 0;
        const avgProcessingTime = processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;

        const avgActualShrinkFactor = actualShrinkFactors.length > 0 ? actualShrinkFactors.reduce((a, b) => a + b, 0) / actualShrinkFactors.length : 0;
        const avgActualYieldEfficiency = avgActualShrinkFactor > 0 ? 100 / avgActualShrinkFactor : 0;

        const avgEstShrinkFactor = filteredProjects.length > 0 ? totalEstShrinkFactor / filteredProjects.length : 0;
        const avgTargetYieldEfficiency = avgEstShrinkFactor > 0 ? 100 / avgEstShrinkFactor : 0;

        return {
            totalCherryDelivered,
            totalCurrentlyDrying,
            totalInStorage,
            totalGreenBeanHulled,
            topFarmers,
            deliveryChartData,
            projectFulfillment,
            totalGreenBeanSold,
            totalRequiredGreenBeanMass,
            avgGreenBeanQuality,
            avgProcessingTime,
            avgActualYieldEfficiency,
            avgTargetYieldEfficiency,
            avgActualShrinkFactor,
        };

    }, [filteredProjects, startDate, endDate, allClients, allFarmers]);

    return metrics;
};