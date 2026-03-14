// ==> src/utils/batchName.ts <==
import type { Project, ProcessingBatch, Delivery, Farmer } from '../types';

export const getBatchName = (
    project: Project,
    batch: ProcessingBatch | Delivery,
    stage?: 'drying' | 'moisture' | 'storage' | 'start_hulling' | 'complete_hulling' | 'sale' | 'processing',
    allFarmers: Farmer[] = []
): string => {

    // 1. Handle Raw Deliveries
    if ('farmerId' in batch && !('currentStage' in batch)) {
        const delivery = batch as Delivery;
        const farmer = allFarmers.find(f => f.id === delivery.farmerId) || (project.farmers || []).find(f => f.id === delivery.farmerId);
        const farmerName = farmer?.name || 'Unknown Farmer';
        return `${delivery.weight} kg from ${farmerName} on ${delivery.date}`;
    }

    // 2. Handle Unified Processing Batches
    if ('currentStage' in batch) {
        const pb = batch as ProcessingBatch;
        let baseName = `Batch #${pb.id.slice(0, 8)}`;

        // Construct name based on traceability snapshot
        if (pb.traceabilitySnapshot && pb.traceabilitySnapshot.length > 0) {
            if (pb.traceabilitySnapshot.length === 1) {
                const farmerId = pb.traceabilitySnapshot[0].farmerId;
                const farmer = allFarmers.find(f => f.id === farmerId) || (project.farmers || []).find(f => f.id === farmerId);
                const farmerName = farmer?.name || 'Unknown Farmer';
                baseName = `${pb.weight.toFixed(1)} kg from ${farmerName}`;
            } else {
                baseName = `${pb.weight.toFixed(1)} kg from ${pb.traceabilitySnapshot.length} farmers`;
            }
        } else {
            baseName = `${pb.weight.toFixed(1)} kg (Batch #${pb.id.slice(0, 8)})`;
        }

        // Append stage-specific telemetry and data if requested
        switch (stage) {
            case 'moisture':
            case 'storage': {
                const logs = pb.moistureLogs || [];
                const lastMoisture = logs.length > 0 ? logs[logs.length - 1] : undefined;
                let details = [];

                if (lastMoisture) details.push(`Last: ${lastMoisture.percentage}%`);
                if (pb.putAwayDate) details.push(`Storage: ${pb.putAwayDate}`);

                return details.length > 0 ? `${baseName} (${details.join(' & ')})` : baseName;
            }
            case 'sale': {
                const exportStep = pb.history.find(h => h.stage === 'EXPORT_READY');
                if (exportStep && exportStep.startDate) {
                    return `${baseName} (Export Ready: ${exportStep.startDate})`;
                }
                return baseName;
            }
            default:
                return baseName;
        }
    }

    return 'Unknown Item';
};