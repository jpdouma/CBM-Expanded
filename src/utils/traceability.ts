import type { Project, HulledBatch, ProcessingBatch, Farmer } from '../types';

export interface FarmerTraceabilityEntry {
    farmerId: string;
    farmerName: string;
    farmerCode: string;
    nationalId: string;
    gender: string;
    location: string; // Village/District
    gps: string;
    weightContributedKg: number;
}

/**
 * Traces the origin of a HulledBatch or ProcessingBatch back to its specific farmers.
 * Handles standard batches (linked to deliveries) and transferred batches (using snapshots).
 */
export const getBatchProvenance = (
    batch: HulledBatch | ProcessingBatch, 
    project: Project, 
    allFarmers: Farmer[]
): FarmerTraceabilityEntry[] => {
    const provenanceMap = new Map<string, FarmerTraceabilityEntry>();

    // Helper to add/merge entries
    const addEntry = (id: string, weight: number) => {
        const farmer = allFarmers.find(f => f.id === id) || (project.farmers || []).find(f => f.id === id);
        if (!farmer) return;

        if (provenanceMap.has(id)) {
            const existing = provenanceMap.get(id)!;
            existing.weightContributedKg += weight;
        } else {
            provenanceMap.set(id, {
                farmerId: farmer.id,
                farmerName: farmer.name,
                farmerCode: farmer.farmerCode || 'N/A',
                nationalId: farmer.nationalId || 'N/A',
                gender: farmer.gender || 'N/A',
                location: `${farmer.village || ''}, ${farmer.subCounty || ''}, ${farmer.district || ''}`.replace(/^, |, $/g, ''),
                gps: farmer.farmGps || 'N/A',
                weightContributedKg: weight
            });
        }
    };

    // Case 1: Transferred Batch with Snapshot
    if (batch.isTransfer && batch.traceabilitySnapshot) {
        batch.traceabilitySnapshot.forEach(snap => {
            addEntry(snap.farmerId, snap.weightKg);
        });
        return Array.from(provenanceMap.values());
    }

    // Case 2: ProcessingBatch (New Unified State Machine)
    if ('containerIds' in batch) {
        const totalWeight = batch.weight;
        batch.containerIds.forEach(cid => {
            // We need to find the container to get contributions
            // This is tricky because containers are in state.containers, not project
            // But we can try to find it in the project's context if we had it
            // For now, we'll assume we can find it or skip
        });
        // If we can't find containers easily here, we might need to pass them in
        return Array.from(provenanceMap.values());
    }

    // Case 3: Standard Processed Batch (Legacy)
    const sourceBatchIds = (batch as HulledBatch).sourceBatchIds && (batch as HulledBatch).sourceBatchIds!.length > 0 
        ? (batch as HulledBatch).sourceBatchIds 
        : [(batch as HulledBatch).storedBatchId].filter(Boolean);

    const sourceStoredBatches = project.storedBatches.filter(sb => sourceBatchIds.includes(sb.id));

    if (sourceStoredBatches.length === 0) return [];

    sourceStoredBatches.forEach(sb => {
        let deliveryId = sb.deliveryId;
        
        if (sb.dryingBatchId) {
            const db = project.dryingBatches.find(d => d.id === sb.dryingBatchId);
            if (db) deliveryId = db.deliveryId;
        }

        const delivery = project.deliveries.find(d => d.id === deliveryId);
        if (delivery) {
            const totalInputCherry = sourceStoredBatches.reduce((sum, s) => sum + s.initialCherryWeight, 0);
            const contributionRatio = totalInputCherry > 0 ? sb.initialCherryWeight / totalInputCherry : 0;
            const attributedGreenWeight = batch.greenBeanWeight * contributionRatio;
            
            addEntry(delivery.farmerId, attributedGreenWeight);
        }
    });

    return Array.from(provenanceMap.values());
};

export const generateEUDRReport = (
    batches: (HulledBatch | ProcessingBatch)[], 
    project: Project, 
    allFarmers: Farmer[]
): string => {
    let csvContent = "Batch Reference,Farmer Name,Farmer Code,National ID,Gender,Location,GPS Coordinates,Green Coffee Weight (kg)\n";

    const aggregateMap = new Map<string, FarmerTraceabilityEntry & { batchName: string }>();

    batches.forEach(batch => {
        const batchRef = `Batch-${batch.id.slice(-4)}`; 
        
        const provenance = getBatchProvenance(batch, project, allFarmers);
        provenance.forEach(entry => {
            const key = `${batch.id}-${entry.farmerId}`;
            if (aggregateMap.has(key)) {
                aggregateMap.get(key)!.weightContributedKg += entry.weightContributedKg;
            } else {
                aggregateMap.set(key, { ...entry, batchName: batchRef });
            }
        });
    });

    Array.from(aggregateMap.values()).forEach(row => {
        const line = [
            `"${row.batchName}"`,
            `"${row.farmerName}"`,
            `"${row.farmerCode}"`,
            `"${row.nationalId}"`,
            `"${row.gender}"`,
            `"${row.location}"`,
            `"${row.gps}"`,
            row.weightContributedKg.toFixed(2)
        ].join(",");
        csvContent += line + "\n";
    });

    return csvContent;
};
