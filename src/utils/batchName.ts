// Fix: Correctly import types from the centralized types file.
import type { Project, ProcessingBatch, DryingBatch, StoredBatch, HullingBatch, HulledBatch, Delivery, Farmer } from '../types';

export const getBatchName = (
    project: Project,
    batch: ProcessingBatch | DryingBatch | StoredBatch | HullingBatch | HulledBatch | Delivery,
    stage: 'drying' | 'moisture' | 'storage' | 'start_hulling' | 'complete_hulling' | 'sale' | 'processing',
    allFarmers: Farmer[] = []
): string => {
    const findDelivery = (deliveryId: string) => project.deliveries.find(d => d.id === deliveryId);

    let delivery: Delivery | undefined;
    let initialWeight = 0;
    let storedBatch: StoredBatch | undefined;

    if ('weight' in batch && 'farmerId' in batch) { // It's a Delivery
        delivery = batch;
        initialWeight = delivery.weight;
    } else if ('containerIds' in batch) { // It's a ProcessingBatch
        const firstContainerId = batch.containerIds[0];
        const container = (project as any).state?.containers?.find((c: any) => c.id === firstContainerId);
        if (container && container.contributions.length > 0) {
            delivery = findDelivery(container.contributions[0].deliveryId);
        }
        initialWeight = batch.weight;
    } else if ('storedBatchId' in batch) { // HullingBatch or HulledBatch
        storedBatch = project.storedBatches.find(sb => sb.id === batch.storedBatchId);
        if (storedBatch) {
            delivery = findDelivery(storedBatch.deliveryId);
            initialWeight = storedBatch.initialCherryWeight;
        }
    } else if ('dryingBatchId' in batch) { // StoredBatch
        storedBatch = batch;
        const dryingBatch = project.dryingBatches.find(db => db.id === storedBatch!.dryingBatchId);
        if (dryingBatch) {
            delivery = findDelivery(dryingBatch.deliveryId);
        }
        initialWeight = batch.initialCherryWeight;
    } else { // DryingBatch
        delivery = findDelivery(batch.deliveryId);
        initialWeight = batch.initialCherryWeight;
    }

    if (!delivery) {
        if ('deliveryId' in batch && !(batch as any).id) {
            return `Unknown Delivery (ID: ${batch.deliveryId.slice(-4)})`;
        }
        return `Unknown Batch (ID: ${(batch as any).id?.slice(-4) || 'N/A'})`;
    }
    
    // Lookup farmer in global list provided, or fallback to project local legacy list
    const farmer = allFarmers.find(f => f.id === delivery!.farmerId) || (project.farmers || []).find(f => f.id === delivery!.farmerId);
    const farmerName = farmer?.name || 'Unknown Farmer';
    
    const baseName = `${initialWeight} kg from ${farmerName} on ${delivery!.date}`;
    
    const isMachineDried = project.isMachineDrying && storedBatch && !storedBatch.dryingBatchId;

    if (isMachineDried) {
         return `${baseName} (Machine)`;
    }

    switch (stage) {
        case 'drying':
            return baseName;

        case 'moisture':
        case 'storage': {
            let dryingBatch: DryingBatch | undefined;
            if ('dryingBatchId' in batch && batch.dryingBatchId) { // StoredBatch with a drying batch
                dryingBatch = project.dryingBatches.find(db => db.id === batch.dryingBatchId);
            } else if ('moistureMeasurements' in batch) { // This must be a DryingBatch
                dryingBatch = batch;
            }
            const measurements = dryingBatch?.moistureMeasurements || [];
            const lastMoisture = measurements.length > 0 ? measurements[measurements.length - 1] : undefined;
            return lastMoisture ? `${baseName} (Last: ${lastMoisture.percentage}%)` : baseName;
        }

        case 'start_hulling': {
             if (storedBatch) {
                 const dryingBatch = project.dryingBatches.find(db => db.id === storedBatch.dryingBatchId);
                 const measurements = dryingBatch?.moistureMeasurements || [];
                 const lastMoisture = measurements.length > 0 ? measurements[measurements.length - 1] : undefined;
                 const storageDate = storedBatch.storageDate;
                 let details = [];
                 if(lastMoisture) details.push(`Last: ${lastMoisture.percentage}%`);
                 if(storageDate) details.push(`Storage: ${storageDate}`);
                 return details.length > 0 ? `${baseName} (${details.join(' & ')})` : baseName;
             }
             return baseName;
        }
        case 'complete_hulling': {
            if ('storedBatchId' in batch) {
                const associatedStoredBatch = project.storedBatches.find(sb => sb.id === batch.storedBatchId);
                return `${baseName} with storage start date: ${associatedStoredBatch?.storageDate}`;
            }
            return baseName;
        }

        case 'sale': {
             if ('greenBeanWeight' in batch) { // The batch is a HulledBatch
                 const hulledBatch = batch;
                 return `${hulledBatch.greenBeanWeight} kg from ${farmerName} on processed date: ${hulledBatch.hullingDate}`;
             }
             return baseName;
        }
        
        default:
            return baseName;
    }
};
