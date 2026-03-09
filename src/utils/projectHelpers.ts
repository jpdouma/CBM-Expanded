import type { Project, ClientDetails, DryingBed } from '../types';

export const defaultClientDetails: Omit<ClientDetails, 'id'> = {
    status: "New",
    date: new Date().toISOString().split('T')[0],
    requestBy: "",
    role: "creditor",
    companyName: "",
    website: "",
    address: "",
    cityAndState: "",
    postCode: "",
    country: "",
    phone: "",
    invoiceAddress: "",
    invoiceCityAndState: "",
    invoicePostCode: "",
    invoiceCountry: "",
    invoiceLanguage: "English",
    defaultCurrency: "Euros",
    generalName: "",
    generalTitle: "",
    generalEmail: "",
    generalPhone: "",
    generalMobile: "",
    financeName: "",
    financeTitle: "",
    financeEmail: "",
    financePhone: "",
    financeMobile: "",
    vatNo: "",
    companyRegNo: "",
    eoriOrEinType: "eori",
    eoriOrEinValue: "",
    bankName: "",
    accountName: "",
    bankAddress: "",
    accountIdentifierType: "iban",
    accountIdentifierValue: "",
    swiftOrBicType: "bic",
    swiftOrBicValue: "",
    sortOrRoutingType: "sort",
    sortOrRoutingValue: "",
    requestedCreditLimit: "",
    requestedPaymentTerms: "",
    debtorNoScope: "",
    creditorNoScope: "",
    poa: false,
    scope: false,
    gdpr: false,
    credit: false,
    companyRegistration: false,
    passport: false,
    signedQuote: false,
    highrise: false,
    creditCheck: false,
    it: false,
    exact: false,
    bank: false,
    remarks: "",
    agreementDate: "",
    signature: ""
};

export const createNewProject = (name: string, tier: 'HIGH_COMMERCIAL' | 'TARGET_SPECIALTY' | 'MICRO_LOTS' = 'HIGH_COMMERCIAL'): Project => ({
    id: crypto.randomUUID(),
    name,
    tier,
    startDate: new Date().toISOString().split('T')[0],
    estDryingTimeDays: 15,
    estShrinkFactor: 6.25,
    isMachineDrying: false,
    dryingBedIds: [],
    targetMoisturePercentage: 11.5,
    // FIX: Initialize to 0 so the UI placeholder "Enter contracted mass..." can show
    requiredGreenBeanMassKg: 0, 
    exchangeRateUGXtoUSD: 3750,
    targetSalePricePerKg: 0,
    targetSalePriceCurrency: 'USD',
    // Initialize cherry cost fields
    estCostPerKgCherry: 0,
    estCostPerKgCherryCurrency: 'USD',
    estCostPerKgCherryUSD: 0, 
    
    clientId: null,
    financierIds: [],
    preProjectChecklist: { contractSigned: false, accountCardSubmitted: false, projectSetupComplete: false, forecastGenerated: false, firstWithdrawalReceived: false, projectStarted: false },
    farmers: [],
    farmerIds: [],
    setupCosts: [],
    advances: [],
    deliveries: [],
    processingBatches: [], // NEW
    dryingBatches: [],
    storedBatches: [],
    hullingBatches: [],
    hulledBatches: [],
    sales: [],
    financing: [],
    clientDetails: { ...defaultClientDetails, id: crypto.randomUUID() }
});

export const getRecalculatedDryingBeds = (project: Project, allDryingBeds: DryingBed[]): { updatedBedIds: string[], releasedBeds: DryingBed[] } => {
    if (project.isMachineDrying || !project.dryingBedIds || project.dryingBedIds.length === 0) {
        return { updatedBedIds: project.dryingBedIds || [], releasedBeds: [] };
    }

    // 1. Calculate Required Future Capacity
    const totalRequiredCherryMass = project.requiredGreenBeanMassKg * project.estShrinkFactor;
    const totalDeliveredCherryMass = project.deliveries.reduce((sum, d) => sum + d.weight, 0);
    const remainingCherriesToBuy = Math.max(0, totalRequiredCherryMass - totalDeliveredCherryMass);

    const dryingBatchDeliveryIds = new Set(project.dryingBatches.map(db => db.deliveryId));
    const undriedCherryMass = project.deliveries
        .filter(d => !dryingBatchDeliveryIds.has(d.id))
        .reduce((sum, d) => sum + d.weight, 0);
    
    const requiredFutureCapacity = remainingCherriesToBuy + undriedCherryMass;

    // 2. Greedy algorithm to find beds to keep
    const assignedBeds = project.dryingBedIds
        .map(id => allDryingBeds.find(b => b.id === id))
        .filter((b): b is DryingBed => !!b)
        .sort((a, b) => b.capacityKg - a.capacityKg); // Sort descending by capacity

    const bedsToKeep: DryingBed[] = [];
    let capacityMet = 0;

    for (const bed of assignedBeds) {
        if (capacityMet < requiredFutureCapacity) {
            bedsToKeep.push(bed);
            capacityMet += bed.capacityKg;
        }
    }
    
    // 3. Determine released beds
    const keptBedIds = new Set(bedsToKeep.map(b => b.id));
    const releasedBeds = assignedBeds.filter(b => !keptBedIds.has(b.id));

    return {
        updatedBedIds: bedsToKeep.map(b => b.id),
        releasedBeds: releasedBeds,
    };
};
