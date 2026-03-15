// ==> src/utils/traceability.ts <==
import type { Project, ProcessingBatch, Farmer } from '../types';

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
 * Traces the origin of a ProcessingBatch back to its specific farmers.
 * In the unified state machine, this is read directly from the batch's traceabilitySnapshot
 * which accurately tracks splits, merges, and transfers across the pipeline.
 */
export const getBatchProvenance = (
    batch: ProcessingBatch,
    project: Project,
    allFarmers: Farmer[]
): FarmerTraceabilityEntry[] => {
    const provenanceMap = new Map<string, FarmerTraceabilityEntry>();

    if (!batch.traceabilitySnapshot || batch.traceabilitySnapshot.length === 0) {
        return [];
    }

    // Helper to add/merge entries
    const addEntry = (id: string, weight: number) => {
        const farmer = allFarmers.find(f => f.id === id) || (project.farmers || []).find(f => f.id === id);
        if (!farmer) return;

        if (provenanceMap.has(id)) {
            const existing = provenanceMap.get(id)!;
            existing.weightContributedKg += weight;
        } else {
            // Clean up formatting for missing location data
            const locationStr = `${farmer.village || ''}, ${farmer.subCounty || ''}, ${farmer.district || ''}`
                .replace(/(^,\s*)|(,\s*$)/g, '') // Remove leading/trailing commas
                .replace(/,\s*,/g, ',');         // Remove double commas

            provenanceMap.set(id, {
                farmerId: farmer.id,
                farmerName: farmer.name,
                farmerCode: farmer.farmerCode || 'N/A',
                nationalId: farmer.nationalId || 'N/A',
                gender: farmer.gender || 'N/A',
                location: locationStr || 'N/A',
                gps: farmer.farmGps || 'N/A',
                weightContributedKg: weight
            });
        }
    };

    batch.traceabilitySnapshot.forEach(snap => {
        addEntry(snap.farmerId, snap.weightKg);
    });

    return Array.from(provenanceMap.values());
};

export const generateEUDRReport = (
    batches: ProcessingBatch[],
    project: Project,
    allFarmers: Farmer[]
): string => {
    let csvContent = "Batch Reference,Farmer Name,Farmer Code,National ID,Gender,Location,GPS Coordinates,Green Coffee Weight (kg)\n";

    const aggregateMap = new Map<string, FarmerTraceabilityEntry & { batchName: string }>();

    // SPRINT 1.1: EUDR Compliance Hardening
    // Filter strictly to EXPORT_READY batches to avoid WIP mass inflation
    const validBatches = batches.filter(b => b.currentStage === 'EXPORT_READY');

    validBatches.forEach(batch => {
        const batchRef = `Batch-${batch.id.slice(0, 8)}`;

        const provenance = getBatchProvenance(batch, project, allFarmers);

        // The traceability snapshot tracks raw cherry input equivalents. 
        // For the EUDR report, we need to report the final exported GREEN coffee weight.
        // We calculate the yield ratio for this specific batch to scale the farmer contributions.
        const totalSnapshotWeight = (batch.traceabilitySnapshot || []).reduce((sum, s) => sum + s.weightKg, 0);
        const yieldRatio = totalSnapshotWeight > 0 ? batch.weight / totalSnapshotWeight : 0;

        provenance.forEach(entry => {
            const key = `${batch.id}-${entry.farmerId}`;
            const greenWeightContributed = entry.weightContributedKg * yieldRatio;

            if (aggregateMap.has(key)) {
                aggregateMap.get(key)!.weightContributedKg += greenWeightContributed;
            } else {
                aggregateMap.set(key, { ...entry, weightContributedKg: greenWeightContributed, batchName: batchRef });
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