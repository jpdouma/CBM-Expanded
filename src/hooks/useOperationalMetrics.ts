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
        const cuppingScores2: number[] = [];
        const farmerDeliveries: Record<string, number> = {};
        let totalEstShrinkFactor = 0;
        
        const farmerNameMap = new Map<string, string>();
        allFarmers.forEach(f => farmerNameMap.set(f.id, f.name));
        // Add fallback for legacy local farmers
        filteredProjects.forEach(p => (p.farmers || []).forEach(f => {
            if (!farmerNameMap.has(f.id)) farmerNameMap.set(f.id, f.name);
        }));
        
        const start = new Date(startDate);
        start.setUTCHours(0,0,0,0);
        const end = new Date(endDate);
        end.setUTCHours(23,59,59,999);

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
            totalRequiredGreenBeanMass += p.requiredGreenBeanMassKg;
            totalEstShrinkFactor += p.estShrinkFactor;

            const storedBatchIds = new Set((p.storedBatches || []).map(sb => sb.dryingBatchId));
            const hullingBatchIds = new Set((p.hullingBatches || []).map(hb => hb.storedBatchId));
            const hulledBatchIds = new Set((p.hulledBatches || []).map(hld => hld.storedBatchId));
            const soldBatchIds = new Set((p.sales || []).flatMap(s => s.hulledBatchIds || []));

            (p.deliveries || []).forEach(d => {
                totalCherryDelivered += d.weight;
                farmerDeliveries[d.farmerId] = (farmerDeliveries[d.farmerId] || 0) + d.weight;
            });

            (p.dryingBatches || []).forEach(db => {
                if (!storedBatchIds.has(db.id)) {
                    totalCurrentlyDrying += db.initialCherryWeight;
                }
            });

            (p.storedBatches || []).forEach(sb => {
                if (!hullingBatchIds.has(sb.id) && !hulledBatchIds.has(sb.id)) {
                    totalInStorage += sb.initialCherryWeight;
                }
            });
            
            (p.hulledBatches || []).forEach(hb => {
                totalGreenBeanHulled += hb.greenBeanWeight;
                if (soldBatchIds.has(hb.id)) {
                    totalGreenBeanSold += hb.greenBeanWeight;
                }
                if(hb.cuppingScore2) cuppingScores2.push(hb.cuppingScore2);
                if (hb.initialCherryWeight > 0 && hb.greenBeanWeight > 0) {
                     actualShrinkFactors.push(hb.initialCherryWeight / hb.greenBeanWeight);
                }

                const storedBatch = (p.storedBatches || []).find(sb => sb.id === hb.storedBatchId);
                if (storedBatch) {
                    const dryingBatch = (p.dryingBatches || []).find(db => db.id === storedBatch.dryingBatchId);
                    if (dryingBatch) {
                        const delivery = (p.deliveries || []).find(d => d.id === dryingBatch.deliveryId);
                        if (delivery) {
                            processingTimes.push(dayDiff(new Date(delivery.date), new Date(hb.hullingDate)));
                        }
                    }
                }
            });
        });
        
        const topFarmers = Object.entries(farmerDeliveries)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([farmerId, weight]) => ({ id: farmerId, name: farmerNameMap.get(farmerId) || 'Unknown', weight }));
            
        const projectFulfillment = totalRequiredGreenBeanMass > 0 ? (totalGreenBeanSold / totalRequiredGreenBeanMass) * 100 : 0;
        const avgGreenBeanQuality = cuppingScores2.length > 0 ? cuppingScores2.reduce((a, b) => a + b, 0) / cuppingScores2.length : 0;
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
