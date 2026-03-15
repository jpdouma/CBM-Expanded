// ==> src/utils/migrations.ts <==
import { defaultClientDetails } from "../reducers/projectReducer";
import type { ProjectState, Project, ClientDetails, Financier, DryingBed, StorageLocation, Farmer, ProcessingMethod } from "../types";

const defaultProcessingMethods: ProcessingMethod[] = [
    {
        id: 'method-washed',
        name: 'Washed (Wet) Process',
        description: 'Traditional wet process involving pulping and washing.',
        flavorProfile: 'Clean, bright taste with higher acidity and clear, origin-specific notes.',
        pipeline: ['RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'WASHING', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
        isSystem: true
    },
    {
        id: 'method-natural',
        name: 'Natural (Dry) Process',
        description: 'Traditional dry process where cherries are dried whole.',
        flavorProfile: 'Fuller body with intense sweetness and funky, fruit-forward notes like blueberry.',
        pipeline: ['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
        isSystem: true
    },
    {
        id: 'method-honey',
        name: 'Honey (Pulped Natural) Process',
        description: 'Cherries are pulped but dried with mucilage still attached.',
        flavorProfile: 'Balances the clarity of washed coffee with the sweetness and body of natural.',
        pipeline: ['RECEPTION', 'FLOATING', 'PULPING', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
        isSystem: true
    },
    {
        id: 'method-anaerobic',
        name: 'Anaerobic Fermentation',
        description: 'Fermented in sealed, oxygen-free tanks.',
        flavorProfile: 'Unique complex acids and esters from oxygen-free stainless steel tanks.',
        pipeline: ['RECEPTION', 'FLOATING', 'ANAEROBIC_FERMENTATION', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
        isSystem: true
    },
    {
        id: 'method-carbonic',
        name: 'Carbonic Maceration',
        description: 'Fermented in a carbon dioxide-rich environment.',
        flavorProfile: 'Wildly unique notes such as red wine, banana, or bubblegum.',
        pipeline: ['RECEPTION', 'FLOATING', 'CARBONIC_MACERATION', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
        isSystem: true
    },
    {
        id: 'method-thermal',
        name: 'Thermal Shock',
        description: 'Exposed to dramatic temperature changes to lock in flavor.',
        flavorProfile: 'Specific aromas and flavors locked in via dramatic temperature changes.',
        pipeline: ['RECEPTION', 'FLOATING', 'THERMAL_SHOCK', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
        isSystem: true
    }
];

export const migrateLegacyState = (parsedState: any): ProjectState => {
    // 0. Extract Farmers from projects if not already global
    const globalFarmers: Farmer[] = parsedState.farmers || [];
    const globalFarmerMap = new Map<string, Farmer>();
    globalFarmers.forEach(f => globalFarmerMap.set(f.id, f));

    const projectsToProcess = parsedState.projects || [];

    // If global farmers list is empty but projects have farmers, lift them up
    projectsToProcess.forEach((p: any) => {
        if (p.farmers && Array.isArray(p.farmers)) {
            p.farmers.forEach((f: Farmer) => {
                if (!f.id) f.id = crypto.randomUUID();
                // Check if farmer exists by ID or Name to avoid duplicates
                if (!globalFarmerMap.has(f.id)) {
                    // Check by name
                    const existing = Array.from(globalFarmerMap.values()).find(gf => gf.name.toLowerCase() === f.name.toLowerCase());
                    if (existing) {
                        // Map legacy ID to existing global ID if needed, handled in step 1
                    } else {
                        globalFarmerMap.set(f.id, f);
                    }
                }
            });
        }
    });

    const finalFarmers = Array.from(globalFarmerMap.values());

    // 1. Migrate Projects
    const projects: Project[] = projectsToProcess.map((p: any) => {

        // Generate farmerIds list from embedded farmers
        let farmerIds: string[] = p.farmerIds || [];
        if (p.farmers && Array.isArray(p.farmers)) {
            p.farmers.forEach((f: Farmer) => {
                // Find the canonical ID in the global list
                const globalFarmer = finalFarmers.find(gf => gf.id === f.id || gf.name.toLowerCase() === f.name.toLowerCase());
                if (globalFarmer && !farmerIds.includes(globalFarmer.id)) {
                    farmerIds.push(globalFarmer.id);
                }
            });
        }

        return {
            ...p,
            // Ensure new booleans exist
            isMachineDrying: p.isMachineDrying || false,
            // Deep merge checklist to ensure all keys exist
            preProjectChecklist: {
                contractSigned: false, accountCardSubmitted: false, projectSetupComplete: false,
                forecastGenerated: false, firstWithdrawalReceived: false, projectStarted: false,
                ...(p.preProjectChecklist || {})
            },
            // Ensure arrays exist
            setupCosts: p.setupCosts || [],
            // farmers: p.farmers || [], // Legacy array kept for safety but we prefer farmerIds now
            farmerIds: farmerIds,
            advances: p.advances || [],
            deliveries: p.deliveries || [],
            processingPipeline: p.processingPipeline || ['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'],
            dryingBatches: p.dryingBatches || [],
            storedBatches: p.storedBatches || [],
            hullingBatches: p.hullingBatches || [],
            sales: p.sales || [],
            financing: p.financing || [],
            dryingBedIds: p.dryingBedIds || [],
            // Ensure clientDetails structure
            clientDetails: { ...defaultClientDetails, ...(p.clientDetails || {}), id: p.clientDetails?.id || crypto.randomUUID() },
            // Migrate Hulled Batches with new palletLevel
            hulledBatches: (p.hulledBatches || []).map((hb: any) => ({
                ...hb,
                palletLevel: hb.palletLevel || 'A'
            }))
        };
    });

    // 2. Migrate Clients (ensure default structure)
    const clients: ClientDetails[] = (parsedState.clients || []).map((c: any) => ({
        ...defaultClientDetails,
        ...c
    }));

    // 3. Migrate Storage Locations (add facilityCode and config arrays)
    const storageLocations: StorageLocation[] = (parsedState.storageLocations || []).map((sl: any) => ({
        ...sl,
        facilityCode: sl.facilityCode || (sl.name ? sl.name.substring(0, 3).toUpperCase() : 'UNK'),
        allowedZones: sl.allowedZones || [],
        allowedRows: sl.allowedRows || [],
        allowedPallets: sl.allowedPallets || [],
        allowedLevels: sl.allowedLevels || ['A', 'B', 'C']
    }));

    // 4. Migrate Users (convert role to roleId)
    const users = (parsedState.users || []).map((u: any) => {
        if (u.role && !u.roleId) {
            // Map legacy role names to system role IDs if they match
            // For simplicity, we'll just map them to the super admin if they were ADMIN, or a generic role otherwise
            // But since we are introducing a new system, we should probably map them to the super admin if they were ADMIN
            const roleId = u.role === 'ADMIN' ? 'system-super-admin' : 'system-super-admin'; // Defaulting to super admin for migration safety
            const { role, ...rest } = u;
            return { ...rest, roleId };
        }
        return u;
    });

    return {
        projects,
        clients,
        financiers: parsedState.financiers || [],
        dryingBeds: parsedState.dryingBeds || [],
        floatingTanks: parsedState.floatingTanks || [],
        selectedProjectIds: parsedState.selectedProjectIds || [],
        storageLocations,
        farmers: finalFarmers,
        users,
        roles: parsedState.roles || [],
        globalSettings: parsedState.globalSettings || { processingCosts: [] },
        buyingPrices: parsedState.buyingPrices || [],
        paymentLines: parsedState.paymentLines || [],
        containers: parsedState.containers || [],
        equipment: parsedState.equipment || [], // SPRINT 8 FIX
        globalCurrency: parsedState.globalCurrency || 'USD',
        processingMethods: parsedState.processingMethods?.length ? parsedState.processingMethods : defaultProcessingMethods,
    };
};

export const processImportedData = (
    importedProjects: any[],
    importedClients: any[],
    importedFinanciers: any[],
    importedDryingBeds: any[],
    importedStorageLocations: any[],
    importedFarmers?: any[],
    importedProcessingMethods?: any[]
): { projects: Project[], clients: ClientDetails[], financiers: Financier[], dryingBeds: DryingBed[], storageLocations: StorageLocation[], farmers: Farmer[], processingMethods: ProcessingMethod[] } => {

    // Reuse migration logic for projects to ensure consistency
    const tempState = {
        projects: importedProjects,
        clients: importedClients,
        financiers: importedFinanciers,
        dryingBeds: importedDryingBeds,
        storageLocations: importedStorageLocations,
        farmers: importedFarmers,
        processingMethods: importedProcessingMethods
    };

    const migratedState = migrateLegacyState(tempState);

    return {
        projects: migratedState.projects,
        clients: migratedState.clients,
        financiers: migratedState.financiers,
        dryingBeds: migratedState.dryingBeds,
        storageLocations: migratedState.storageLocations,
        farmers: migratedState.farmers,
        processingMethods: migratedState.processingMethods
    };
};