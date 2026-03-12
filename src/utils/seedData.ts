import { ProjectAction, ProcessingStage } from '../types';

export const seedDummyData = (dispatch: React.Dispatch<ProjectAction>) => {
    const generateId = () => {
        try {
            return crypto.randomUUID();
        } catch (e) {
            return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
    };

    console.log("Starting seeding process...");

    // 1. Setup: Create a new Project (Tier 1 - Washed), 3 Farmers (with bank details), and 2 Drying Beds.
    const projectId = generateId();
    const farmer1Id = generateId();
    const farmer2Id = generateId();
    const farmer3Id = generateId();
    const bed1Id = generateId();
    const bed2Id = generateId();

    console.log("Creating project, farmers, and beds...");
    dispatch({ type: 'ADD_FARMER', payload: { id: farmer3Id, farmerData: { name: "David Musoke", airtelMoneyNumber: "0752123456", phoneNumber: "+256 752 123456", district: "Mubende" } } });

    dispatch({ type: 'ADD_DRYING_BED', payload: { id: bed1Id, bedData: { uniqueNumber: "10-2026-PETER", capacityKg: 500, areaM2: 20, creationDate: "2026-03-08" } } });
    dispatch({ type: 'ADD_DRYING_BED', payload: { id: bed2Id, bedData: { uniqueNumber: "10-2026-SARAH", capacityKg: 500, areaM2: 20, creationDate: "2026-03-08" } } });

    // Link farmers and beds to project
    dispatch({ type: 'UPDATE_PROJECT', payload: { projectId, updates: { farmerIds: [farmer1Id, farmer2Id, farmer3Id], dryingBedIds: [bed1Id, bed2Id], exchangeRateUGXtoUSD: 3800 } } });

    // 2. Pricing: Dispatch a Director action to set active BuyingPrices
    console.log("Publishing buying prices...");
    const pricesId = generateId();
    dispatch({
        type: 'PUBLISH_BUYING_PRICES',
        payload: {
            id: pricesId,
            data: {
                validFrom: "2026-01-01",
                validTo: "2026-12-31",
                unripe: 500,
                earlyRipe: 1200,
                optimal: 2500,
                overRipe: 800,
                currency: 'UGX'
            }
        }
    });

    // 3. Reception: Log 3 different deliveries from the farmers
    console.log("Logging deliveries...");
    const date = "2026-03-08";
    const paymentLine1Id = generateId();
    const container1Id = generateId();
    const container2Id = generateId();
    const container3Id = generateId();
    const container4Id = generateId();
    const container5Id = generateId();

    dispatch({
        type: 'RECEPTION_DELIVERY',
        payload: {
            projectId,
            farmerId: farmer1Id,
            date,
            weight: 48,
            unripe: 5,
            earlyRipe: 5,
            optimal: 85,
            overRipe: 5,
            paymentLineId: paymentLine1Id,
            newContainerId: container1Id
        }
    });

    dispatch({
        type: 'RECEPTION_DELIVERY',
        payload: {
            projectId,
            farmerId: farmer2Id,
            date,
            weight: 48,
            unripe: 2,
            earlyRipe: 8,
            optimal: 85,
            overRipe: 5,
            newContainerId: container2Id
        }
    });

    dispatch({
        type: 'RECEPTION_DELIVERY',
        payload: {
            projectId,
            farmerId: farmer3Id,
            date,
            weight: 48,
            unripe: 10,
            earlyRipe: 10,
            optimal: 70,
            overRipe: 10,
            newContainerId: container3Id
        }
    });

    // Add 2 more containers to have 5 for bed loading
    dispatch({
        type: 'RECEPTION_DELIVERY',
        payload: {
            projectId,
            farmerId: farmer1Id,
            date,
            weight: 48,
            unripe: 0,
            earlyRipe: 0,
            optimal: 100,
            overRipe: 0,
            newContainerId: container4Id
        }
    });

    dispatch({
        type: 'RECEPTION_DELIVERY',
        payload: {
            projectId,
            farmerId: farmer2Id,
            date,
            weight: 48,
            unripe: 0,
            earlyRipe: 0,
            optimal: 100,
            overRipe: 0,
            newContainerId: container5Id
        }
    });

    // 4. Payments: Approve one of the resulting PaymentLine items
    console.log("Approving payments...");
    dispatch({ type: 'APPROVE_PAYMENT_ACCOUNTANT', payload: { paymentLineId: paymentLine1Id } });
    dispatch({ type: 'APPROVE_PAYMENT_DIRECTOR', payload: { paymentLineId: paymentLine1Id, authCode: "SEED-AUTH-123" } });

    // 6. Bed Loading: Load exactly 5 containers onto one of the Drying Beds
    console.log("Loading drying bed...");
    const containerIds = [container1Id, container2Id, container3Id, container4Id, container5Id];
    dispatch({
        type: 'LOAD_DRYING_BED',
        payload: {
            projectId,
            containerIds,
            dryingBedId: bed1Id,
            startDate: date
        }
    });

    // 7. State Machine: Transition from DRYING -> RESTING
    console.log("Transitioning processing step...");
    // In this app, LOAD_DRYING_BED starts at DESICCATION.
    // We need to find the batchId. The reducer generates it as `${dayOfWeek}-wk${weekStr}${year}-${bedName}`
    // For 2026-03-08 (Sunday), dayOfWeek is 7. Week is 10. Year is 26. Bed is BED-01.
    const batchId = `7-wk1026-BED-01`;

    dispatch({
        type: 'COMPLETE_PROCESSING_STEP',
        payload: {
            projectId,
            batchId,
            stage: 'DESICCATION' as ProcessingStage,
            weightOut: 220, // Mock shrinkage
            endDate: date,
            completedBy: "Admin"
        }
    });

    dispatch({
        type: 'APPROVE_PROCESSING_STEP',
        payload: {
            projectId,
            batchId,
            approvedBy: "Director"
        }
    });

    console.log("Seeding complete!");
};
