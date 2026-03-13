// ==> src/types.ts <==
export type Currency = 'USD' | 'UGX' | 'EUR';

export type Permission =
    | 'VIEW_DASHBOARD_FINANCE'
    | 'VIEW_DASHBOARD_OPS'
    | 'MANAGE_SETTINGS'
    | 'MANAGE_USERS'
    | 'MANAGE_ROLES'
    | 'MANAGE_FARMERS'
    | 'MANAGE_CLIENTS'
    | 'MANAGE_FINANCIERS'
    | 'MANAGE_STORAGE_LOCATIONS'
    | 'MANAGE_CONTAINERS'
    | 'LOG_RECEPTION'
    | 'MANAGE_PRIMARY_PROCESSING'
    | 'MANAGE_SECONDARY_PROCESSING'
    | 'APPROVE_TRANSITIONS_QUALITY'
    | 'APPROVE_PAYMENTS_ACCOUNTANT'
    | 'APPROVE_PAYMENTS_DIRECTOR'
    | 'EXECUTE_PAYMENTS'
    | 'SET_PRICING'
    | 'VIEW_CLIENT_PORTAL'
    | 'VIEW_ACTIVITY_LOG'
    | 'EXPORT_DATA'
    | 'IMPORT_DATA'
    | 'MANAGE_PROJECTS'
    | 'VIEW_INVENTORY';

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    isSystem: boolean;
}

export interface User {
    id: string;
    username: string;
    password: string; // Simple storage for offline-first demo
    roleId: string;
    role?: string; // Legacy role support
    assignedClientId?: string; // If role is CLIENT_VIEWER
    name: string;
}

export interface Farmer {
    id: string;
    name: string;
    // Basic/EUDR Info
    farmGps?: string;
    farmerCode?: string;
    nationalId?: string;
    phoneNumber?: string;
    gender?: string;
    dob?: string;
    district?: string;
    subCounty?: string;
    village?: string;
    totalAcres?: string;
    numberOfBlocks?: string;
    totalTrees?: string;
    productiveTrees?: string;
    coffeeAcres?: string;
    yieldEstimate?: string;
    previousYields?: string;
    otherCrops?: string;
    // Payment Info
    bankName?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankBranch?: string;
    airtelMoneyNumber?: string;
    mtnMoneyNumber?: string;
}

export interface PreProjectChecklist {
    contractSigned: boolean;
    accountCardSubmitted: boolean;
    projectSetupComplete: boolean;
    forecastGenerated: boolean;
    firstWithdrawalReceived: boolean;
    projectStarted: boolean;
}

export interface ProjectSetupCost {
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: Currency;
    amountUSD: number;
}

export interface Advance {
    id: string;
    farmerId: string;
    date: string;
    amount: number;
    currency: Currency;
    amountUSD: number;
    notes?: string;
}

export interface Delivery {
    id: string;
    farmerId: string;
    date: string;
    weight: number; // in kg
    unripePercentage: number;
    earlyRipePercentage: number;
    optimalPercentage: number;
    overRipePercentage: number;
    cost: number;
    currency: Currency;
    costUSD: number;
    advanceOffsetUSD: number;
    amountPaidUSD: number;
}

export interface MoistureMeasurement {
    id: string;
    date: string;
    percentage: number;
}

export interface DryingBatch {
    id: string;
    deliveryId: string;
    startDate: string;
    initialCherryWeight: number;
    moistureMeasurements: MoistureMeasurement[];
}

export interface StoredBatch {
    id: string;
    deliveryId: string;
    dryingBatchId?: string | null;
    storageDate: string;
    initialCherryWeight: number;
    weight?: number;
    locationId?: string;
    actualDryingDays?: number;
    cuppingScore1?: number;
}

export interface HullingBatch {
    id: string;
    storedBatchId: string;
    startDate: string;
}

export interface HulledBatch {
    id: string;
    storedBatchId: string;
    deliveryId: string;
    hullingDate: string;
    initialCherryWeight: number;
    greenBeanWeight: number;
    cuppingScore2?: number;
    isTransfer?: boolean;
    traceabilitySnapshot?: { farmerId: string; weightKg: number }[];
    sourceBatchIds?: string[];
    palletLevel?: string;
    isRemainder?: boolean;
    consumedByBatchId?: string;
    bagCount?: number;
    bagWeightKg?: number;
    costBasisUSD?: number;
    warehouseLocation?: string;
    storageZone?: string;
    palletId?: string;
    sourceProjectId?: string;
}

export type ProcessingTier = 'HIGH_COMMERCIAL' | 'TARGET_SPECIALTY' | 'MICRO_LOTS';

export interface BuyingPrices {
    id: string;
    validFrom: string;
    validTo: string;
    unripe: number;
    earlyRipe: number;
    optimal: number;
    overRipe: number;
    currency: Currency;
}

export type PaymentStatus = 'PENDING_ACCOUNTANT' | 'PENDING_DIRECTOR' | 'APPROVED_FOR_EXECUTION';

export interface PaymentLine {
    id: string;
    deliveryId: string;
    farmerId: string;
    amount: number;
    currency: Currency;
    status: PaymentStatus;
    authCode?: string;
    date: string;
}

export interface Container {
    id: string;
    label: string;
    weight: number; // Max 48kg
    contributions: { farmerId: string; deliveryId: string; weight: number }[];
    date: string;
    status: 'AVAILABLE' | 'IN_USE' | 'QUARANTINED';
}

export type ProcessingStage = 'RECEPTION' | 'FLOATING' | 'PULPING' | 'FERMENTATION' | 'DESICCATION' | 'RESTING' | 'DE_STONING' | 'HULLING' | 'POLISHING' | 'GRADING' | 'DENSITY' | 'COLOR_SORTING' | 'EXPORT_READY';

export type BatchStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED';

export interface ProcessingStepLog {
    stage: ProcessingStage;
    startDate: string;
    endDate?: string;
    completedBy?: string;
    approvedBy?: string;
    weightOut?: number;
    floaterWeight?: number;
    isOutsourced?: boolean;
    outsourcedCost?: number;
}

export interface ProcessingBatch {
    id: string;
    projectId: string;
    containerIds: string[];
    dryingBedId?: string;
    currentStage: ProcessingStage;
    status: BatchStatus;
    weight: number; // Current weight
    moistureLogs: MoistureMeasurement[];
    cuppingScore?: number;
    history: ProcessingStepLog[];

    // Sprint 24: Bed Lock
    isLocked?: boolean;

    // Logistics / Inventory
    warehouseLocation?: string;
    storageZone?: string;
    storageRow?: string;
    palletId?: string;
    palletLevel?: string;
    putAwayDate?: string;

    bagWeightKg?: number;
    bagCount?: number;

    // Transfer / Remainder tracking
    isTransfer?: boolean;
    isRemainder?: boolean;
    consumedByBatchId?: string;
    sourceProjectId?: string;

    // EUDR
    costBasisUSD?: number;
    traceabilitySnapshot?: { farmerId: string, weightKg: number }[];

    isOutsourced?: boolean;
    pendingApproval?: boolean;
}

export interface GlobalSettings {
    processingCosts: { stage: ProcessingStage, standardCost: number, variableLaborCost: number }[];
}

export interface LogisticsCost {
    id: string;
    description: string; // e.g., "Ocean Freight", "Insurance"
    amount: number;
    currency: Currency;
    amountUSD: number;
}

export interface PaymentInstallment {
    id: string;
    description: string; // e.g., "30% Advance", "Balance against Docs"
    dueDate: string;
    percentage: number;
    amountUSD: number;
    isPaid: boolean;
}

export interface Sale {
    id: string;
    invoiceDate: string; // Main date (often invoice date)
    hulledBatchIds: string[]; // Legacy compatibility
    processingBatchIds?: string[]; // New compatibility
    items?: { batchId: string; bags: number }[]; // Supports partial sales
    pricePerKg: number;
    currency: Currency;
    clientName: string;

    // Financials
    totalSaleAmountUSD: number;
    totalCostUSD: number;

    // Logistics
    incoterm?: string; // FOB, CIF, etc.
    logisticsCosts: LogisticsCost[];

    // Payment Schedule
    installments: PaymentInstallment[];

    // Document Data
    shippingAddress?: string;
    containerNumber?: string;
}

export interface Financing {
    id: string;
    financierId: string;
    date: string;
    amountUSD: number;
    interestRateAnnual: number;
}

export interface ClientDetails {
    id: string; // Internal ID
    // Header Info
    status: string;
    date: string;
    requestBy: string;
    role: string;

    // Company Info
    companyName: string;
    website: string;
    address: string;
    cityAndState: string;
    postCode: string;
    country: string;
    phone: string;

    // Invoice Details
    invoiceAddress: string;
    invoiceCityAndState: string;
    invoicePostCode: string;
    invoiceCountry: string;
    invoiceLanguage: string;
    defaultCurrency: string;

    // General Contact
    generalName: string;
    generalTitle: string;
    generalEmail: string;
    generalPhone: string;
    generalMobile: string;

    // Finance Contact
    financeName: string;
    financeTitle: string;
    financeEmail: string;
    financePhone: string;
    financeMobile: string;

    // Registration & Tax
    vatNo: string;
    companyRegNo: string;
    eoriOrEinType: string;
    eoriOrEinValue: string;

    // Banking Info
    bankName: string;
    accountName: string;
    bankAddress: string;
    accountIdentifierType: string;
    accountIdentifierValue: string;
    swiftOrBicType: string;
    swiftOrBicValue: string;
    sortOrRoutingType: string;
    sortOrRoutingValue: string;

    // Terms & Scope
    requestedCreditLimit: string;
    requestedPaymentTerms: string;
    debtorNoScope: string;
    creditorNoScope: string;

    // Internal Checklist
    poa: boolean;
    scope: boolean;
    gdpr: boolean;
    credit: boolean;
    companyRegistration: boolean;
    passport: boolean;
    signedQuote: boolean;
    highrise: boolean;
    creditCheck: boolean;
    it: boolean;
    exact: boolean;
    bank: boolean;
    remarks: string;

    // Agreement
    agreementDate: string;
    signature: string;
}

export interface Financier {
    id: string;
    name: string;
    creditLimitUSD: number;
    interestRateAnnual: number;
}

export interface DryingBed {
    id: string;
    uniqueNumber: string;
    capacityKg: number;
    areaM2: number;
    creationDate: string;
}

export interface StorageLocation {
    id: string;
    name: string;
    facilityCode: string; // New: e.g., UGFP
    description: string;
    allowedZones: string[]; // Config for zones within facility
    allowedRows: string[]; // Config for rows within facility
    allowedPallets: string[]; // Config for pallet positions
    allowedLevels: string[]; // Config for vertical levels (A, B, C)
}

export interface Project {
    id: string;
    name: string;
    tier: ProcessingTier;
    startDate: string;
    estDryingTimeDays: number;
    estShrinkFactor: number;

    // Cost Projections
    estCostPerKgCherryUSD?: number; // Calculated/Stored in USD for logic
    estCostPerKgCherry?: number; // User Input Amount
    estCostPerKgCherryCurrency?: Currency; // User Input Currency

    estKgPerDayCherry?: number;
    isMachineDrying: boolean;
    dryingBedIds: string[];
    targetMoisturePercentage: number;
    requiredGreenBeanMassKg: number;
    exchangeRateUGXtoUSD: number;
    targetSalePricePerKg: number;
    targetSalePriceCurrency: Currency;
    clientId: string | null;
    financierIds: string[];
    preProjectChecklist: PreProjectChecklist;
    farmers?: Farmer[]; // Legacy support, but prefer farmerIds + global state
    farmerIds: string[]; // New: References to global farmers
    setupCosts: ProjectSetupCost[];
    advances: Advance[];
    deliveries: Delivery[];

    // NEW UNIFIED STATE MACHINE
    processingPipeline: ProcessingStage[]; // New data-driven flow
    processingBatches: ProcessingBatch[];

    // LEGACY ARRAYS (kept for compatibility during transition if needed, but we should migrate)
    dryingBatches: DryingBatch[];
    storedBatches: StoredBatch[];
    hullingBatches: HullingBatch[];
    hulledBatches: HulledBatch[];

    sales: Sale[];
    financing: Financing[];
    // Helper to store client snapshot if needed, though typically we use clientId
    clientDetails: ClientDetails;
}

export interface ForecastSnapshot {
    id: string;
    date: string;
    name: string;
    velocity: number;
    costPerKg: number;
    data: { date: string; balance: number; type: 'historical' | 'projected' }[];
}

export interface ProjectState {
    projects: Project[];
    selectedProjectIds: string[];
    dryingBeds: DryingBed[];
    clients: ClientDetails[];
    financiers: Financier[];
    storageLocations: StorageLocation[];
    farmers: Farmer[]; // Global Farmer Pool
    users: User[]; // Authenticated Users
    roles: Role[]; // RBAC Roles
    forecastSnapshots?: ForecastSnapshot[];
    // NEW GLOBAL STATE
    globalSettings: GlobalSettings;
    buyingPrices: BuyingPrices[];
    paymentLines: PaymentLine[];
    containers: Container[];
    globalCurrency?: Currency;
}

export type ActivityLogEntryType = 'setup_cost' | 'financing' | 'advance' | 'delivery' | 'drying_start' | 'moisture_measurement' | 'storage' | 'hulling_start' | 'hulling_complete' | 'sale' | 'transfer_out' | 'transfer_in' | 'processing_step';

export interface ActivityLogEntry {
    id: string;
    date: Date;
    projectId: string;
    projectName: string;
    type: ActivityLogEntryType;
    description: string;
    amountUSD?: number;
}

export interface StatementEntry {
    date: Date;
    description: string;
    withdrawal?: number;
    deposit?: number;
    balance: number;
}

// Project Actions
type AddProjectAction = { type: 'ADD_PROJECT'; payload: { name: string; tier: ProcessingTier; id?: string } };
type DeleteProjectAction = { type: 'DELETE_PROJECT'; payload: { projectId: string } };
type UpdateProjectAction = { type: 'UPDATE_PROJECT'; payload: { projectId: string; updates: Partial<Project> } };
type SetSelectedProjectIdsAction = { type: 'SET_SELECTED_PROJECT_IDS'; payload: { ids: string[] } };
type ImportProjectsAction = { type: 'IMPORT_PROJECTS'; payload: { projects: Project[], clients?: ClientDetails[], financiers?: Financier[], dryingBeds?: DryingBed[], storageLocations?: StorageLocation[], farmers?: Farmer[] } };
type LoadStateAction = { type: 'LOAD_STATE'; payload: ProjectState };
type UpdateChecklistItemAction = { type: 'UPDATE_CHECKLIST_ITEM'; payload: { projectId: string; key: keyof PreProjectChecklist; value: boolean } };
type AddProjectSetupCostAction = { type: 'ADD_PROJECT_SETUP_COST'; payload: { projectId: string; cost: Omit<ProjectSetupCost, 'id' | 'amountUSD'> } };
type UpdateProjectSetupCostAction = { type: 'UPDATE_PROJECT_SETUP_COST'; payload: { projectId: string; costId: string; updates: Partial<Omit<ProjectSetupCost, 'id' | 'amountUSD'>> } };
type RemoveProjectSetupCostAction = { type: 'REMOVE_PROJECT_SETUP_COST'; payload: { projectId: string; costId: string } };
type AddFinancierAction = { type: 'ADD_FINANCIER', payload: { financierData: Omit<Financier, 'id'> } };
type UpdateFinancierAction = { type: 'UPDATE_FINANCIER', payload: { financierId: string, updates: Partial<Omit<Financier, 'id'>> } };
type DeleteFinancierAction = { type: 'DELETE_FINANCIER', payload: { financierId: string } };
type AddFinancingAction = { type: 'ADD_FINANCING'; payload: { projectId: string; data: Omit<Financing, 'id' | 'interestRateAnnual'> } };
type AddDryingBedAction = { type: 'ADD_DRYING_BED', payload: { bedData: Omit<DryingBed, 'id'>; id?: string } };
type UpdateDryingBedAction = { type: 'UPDATE_DRYING_BED', payload: { bedId: string, updates: Partial<Omit<DryingBed, 'id'>> } };
type DeleteDryingBedAction = { type: 'DELETE_DRYING_BED', payload: { bedId: string } };
type AddClientAction = { type: 'ADD_CLIENT', payload: { clientData: Omit<ClientDetails, 'id'> } };
type UpdateClientAction = { type: 'UPDATE_CLIENT', payload: { clientId: string, updates: Partial<Omit<ClientDetails, 'id'>> } };
type DeleteClientAction = { type: 'DELETE_CLIENT', payload: { clientId: string } };
type AddStorageLocationAction = { type: 'ADD_STORAGE_LOCATION', payload: { locationData: Omit<StorageLocation, 'id'> } };
type UpdateStorageLocationAction = { type: 'UPDATE_STORAGE_LOCATION', payload: { locationId: string, updates: Partial<Omit<StorageLocation, 'id'>> } };
type DeleteStorageLocationAction = { type: 'DELETE_STORAGE_LOCATION', payload: { locationId: string } };
type GenerateContainersAction = { type: 'GENERATE_CONTAINERS'; payload: { count: number; date: string } };
type DeleteContainerAction = { type: 'DELETE_CONTAINER'; payload: { containerId: string } };

// Farmer Management Actions
type AddFarmerAction = { type: 'ADD_FARMER'; payload: { farmerData: Omit<Farmer, 'id'>; id?: string } };
type UpdateFarmerAction = { type: 'UPDATE_FARMER'; payload: { farmerId: string; updates: Partial<Omit<Farmer, 'id'>> } };
type DeleteFarmerAction = { type: 'DELETE_FARMER'; payload: { farmerId: string } };
type ImportGlobalFarmersAction = { type: 'IMPORT_GLOBAL_FARMERS'; payload: { farmersData: Partial<Farmer>[] } };
type AddBulkFarmersAction = { type: 'ADD_BULK_FARMERS'; payload: { projectId: string; farmers: Partial<Farmer>[] } };

// User Management Actions
type AddUserAction = { type: 'ADD_USER'; payload: { userData: Omit<User, 'id'> } };
type UpdateUserAction = { type: 'UPDATE_USER'; payload: { userId: string; updates: Partial<User> } };
type DeleteUserAction = { type: 'DELETE_USER'; payload: { userId: string } };

// Role Management Actions
type AddRoleAction = { type: 'ADD_ROLE'; payload: { roleData: Omit<Role, 'id'> } };
type UpdateRoleAction = { type: 'UPDATE_ROLE'; payload: { roleId: string; updates: Partial<Role> } };
type DeleteRoleAction = { type: 'DELETE_ROLE'; payload: { roleId: string } };
type CloneRoleAction = { type: 'CLONE_ROLE'; payload: { roleId: string; newName: string } };

type AddAdvanceAction = { type: 'ADD_ADVANCE'; payload: { projectId: string; data: Omit<Advance, 'id' | 'amountUSD'> } };
type AddBulkAdvancesAction = { type: 'ADD_BULK_ADVANCES'; payload: { projectId: string; advancesData: any[] } };
type AddDeliveryAction = { type: 'ADD_DELIVERY'; payload: { projectId: string; data: Omit<Delivery, 'costUSD' | 'advanceOffsetUSD' | 'amountPaidUSD'> } };
type AddBulkDeliveriesAction = { type: 'ADD_BULK_DELIVERIES'; payload: { projectId: string; deliveriesData: any[] } };

// NEW PROCESSING ACTIONS
type AddContainerAction = { type: 'ADD_CONTAINER'; payload: { data: Omit<Container, 'id'> } };
type UpdateContainerAction = { type: 'UPDATE_CONTAINER'; payload: { containerId: string; updates: Partial<Container> } };
type AssignContainersAction = { type: 'ASSIGN_CONTAINERS'; payload: { projectId: string; deliveryId: string; containerIds: string[] } };
type InitializeBatchAction = { type: 'INITIALIZE_BATCH'; payload: { projectId: string; containerIds: string[]; initialStage: ProcessingStage; dryingBedId?: string; startDate: string } };
type CompleteProcessingStepAction = { type: 'COMPLETE_PROCESSING_STEP'; payload: { projectId: string; batchId: string; stage: ProcessingStage; weightOut?: number; endDate: string; isOutsourced?: boolean; outsourcedCost?: number; completedBy: string; newBedId?: string } };
type ApproveProcessingStepAction = { type: 'APPROVE_PROCESSING_STEP'; payload: { projectId: string; batchId: string; approvedBy: string } };
type ApproveContainerLoadingAction = { type: 'APPROVE_CONTAINER_LOADING'; payload: { projectId: string; batchId: string; officialStartDate: string; approvedBy: string } };
type SetOutsourcedCostAction = { type: 'SET_OUTSOURCED_COST'; payload: { projectId: string; batchId: string; stage: ProcessingStage; cost: number } };
type AddBatchMoistureMeasurementAction = { type: 'ADD_BATCH_MOISTURE_MEASUREMENT'; payload: { projectId: string; batchId: string; data: Omit<MoistureMeasurement, 'id'> } };
type UpdateBatchCuppingScoreAction = { type: 'UPDATE_BATCH_CUPPING_SCORE'; payload: { projectId: string; batchId: string; score: number } };
type ToggleBatchLockAction = { type: 'TOGGLE_BATCH_LOCK'; payload: { projectId: string; batchId: string; } }; // Sprint 24

type CompleteFloatingAction = {
    type: 'COMPLETE_FLOATING';
    payload: {
        projectId: string;
        batchId: string;
        sinkerWeight: number;
        floaterWeight: number;
        sinkerContainerIds: string[];
        floaterContainerIds: string[];
        completedBy: string;
        endDate: string;
    }
};

type MergeBatchesAction = {
    type: 'MERGE_BATCHES';
    payload: {
        projectId: string;
        sourceBatchIds: string[];
        newContainerIds: string[];
        startDate: string;
        completedBy: string;
    }
};

type PutAwayBatchAction = {
    type: 'PUT_AWAY_BATCH';
    payload: {
        projectId: string;
        batchId: string;
        putAwayDate: string;
        mainLocation: { facility: string, zone: string, row: string, pallet: string, level: string };
        remainderLocation?: { facility: string, zone: string, row: string, pallet: string, level: string };
    }
};

// NEW PRICING & PAYMENT ACTIONS
type PublishBuyingPricesAction = { type: 'PUBLISH_BUYING_PRICES'; payload: { data: Omit<BuyingPrices, 'id'>; id?: string } };
type AddPaymentLineAction = { type: 'ADD_PAYMENT_LINE'; payload: { data: Omit<PaymentLine, 'id'> } };
type UpdatePaymentLineStatusAction = { type: 'UPDATE_PAYMENT_LINE_STATUS'; payload: { paymentLineId: string; status: PaymentStatus; authCode?: string } };
type UpdateGlobalSettingsAction = { type: 'UPDATE_GLOBAL_SETTINGS'; payload: { updates: Partial<GlobalSettings> } };

type ApprovePaymentAccountantAction = { type: 'APPROVE_PAYMENT_ACCOUNTANT'; payload: { paymentLineId: string } };
type ApprovePaymentDirectorAction = { type: 'APPROVE_PAYMENT_DIRECTOR'; payload: { paymentLineId: string; authCode: string } };
type ExecutePaymentAction = { type: 'EXECUTE_PAYMENT'; payload: { paymentLineId: string; paymentMethod: string } };
type ReceptionDeliveryAction = { type: 'RECEPTION_DELIVERY'; payload: { projectId: string; farmerId: string; date: string; weight: number; unripe: number; earlyRipe: number; optimal: number; overRipe: number; containerId?: string; deliveryId?: string; paymentLineId?: string; newContainerId?: string } };
type DeleteFinancingAction = { type: 'DELETE_FINANCING'; payload: { projectId: string; eventId: string } };
type CloseContainerAction = { type: 'CLOSE_CONTAINER'; payload: { containerId: string } };

// LEGACY PROCESSING ACTIONS (Keep for now, but we will migrate away)
type StartDryingAction = { type: 'START_DRYING'; payload: { projectId: string; deliveryId: string; startDate: string } };
type AddMoistureMeasurementAction = { type: 'ADD_MOISTURE_MEASUREMENT'; payload: { projectId: string; dryingBatchId: string; data: Omit<MoistureMeasurement, 'id'> } };
type MoveToStorageAction = { type: 'MOVE_TO_STORAGE'; payload: { projectId: string; sourceId: string; sourceType: 'delivery' | 'dryingBatch'; storageDate: string; cuppingScore1: number } };
type StartHullingAction = { type: 'START_HULLING'; payload: { projectId: string; storedBatchId: string; startDate: string } };
type CompleteHullingAction = {
    type: 'COMPLETE_HULLING';
    payload: {
        projectId: string;
        storedBatchIds: string[];
        hullingDate: string;
        greenBeanWeight: number;
        cuppingScore2: number;
        warehouseLocation?: string;
        storageZone?: string;
        bagWeightKg?: number;
        bagCount?: number;
        remainderWeight?: number;
        remainderLocation?: string;
        remainderStorageZone?: string;
        remainderPalletId?: string;
        mergeRemainderBatchIds?: string[];
    }
};

type MoveBatchStockAction = {
    type: 'MOVE_BATCH_STOCK';
    payload: {
        projectId: string;
        batchId: string;
        bagsToMove: number;
        locationData: {
            storageRow: string;
            palletId: string;
            palletLevel: string;
            storageZone?: string;
        }
    }
};

type AddSaleAction = {
    type: 'ADD_SALE';
    payload: {
        projectId: string;
        data: Omit<Sale, 'id' | 'totalSaleAmountUSD' | 'hulledBatchIds'> & {
            items: { batchId: string; bags: number }[]
        }
    }
};

type TransferStockAction = { type: 'TRANSFER_STOCK'; payload: { sourceProjectId: string; targetProjectId: string; batchId: string; weight: number; date: string } };
type UpdateEntryDateAction = { type: 'UPDATE_ENTRY_DATE', payload: { projectId: string, type: ActivityLogEntryType, id: string, newDate: string } };
type BulkUpdateEntryDatesAction = { type: 'BULK_UPDATE_ENTRY_DATES', payload: { updates: { projectId: string; type: ActivityLogEntryType; id: string; newDate: string }[] } };
type RecalculateUsdValuesAction = { type: 'RECALCULATE_USD_VALUES', payload: { progressCallback: (progress: number) => void } };
type SaveForecastSnapshotAction = { type: 'SAVE_FORECAST_SNAPSHOT'; payload: { projectId: string; snapshot: ForecastSnapshot } };
type DeleteForecastSnapshotAction = { type: 'DELETE_FORECAST_SNAPSHOT'; payload: { projectId: string; snapshotId: string } };
type UpdateGlobalCurrencyAction = { type: 'UPDATE_GLOBAL_CURRENCY'; payload: { currency: Currency } };
type DeleteLogEntryAction = {
    type: 'DELETE_LOG_ENTRY';
    payload: { projectId: string; type: ActivityLogEntryType; id: string; }
};
type LoadDryingBedAction = {
    type: 'LOAD_DRYING_BED';
    payload: { projectId: string; containerIds: string[]; dryingBedId: string; startDate: string; completedBy: string; }
};

type HarvestDryingBedAction = {
    type: 'HARVEST_DRYING_BED';
    payload: { projectId: string; batchId: string; driedWeight: number; bagCount: number; endDate: string; completedBy: string; }
};

type PourBatchToBedAction = {
    type: 'POUR_BATCH_TO_BED';
    payload: { projectId: string; batchId: string; dryingBedId: string; }
};

export type ProjectAction =
    | AddProjectAction
    | DeleteProjectAction
    | UpdateProjectAction
    | SetSelectedProjectIdsAction
    | ImportProjectsAction
    | LoadStateAction
    | UpdateChecklistItemAction
    | AddProjectSetupCostAction
    | UpdateProjectSetupCostAction
    | RemoveProjectSetupCostAction
    | AddFinancierAction
    | UpdateFinancierAction
    | DeleteFinancierAction
    | AddFinancingAction
    | AddDryingBedAction
    | UpdateDryingBedAction
    | DeleteDryingBedAction
    | AddClientAction
    | UpdateClientAction
    | DeleteClientAction
    | AddStorageLocationAction
    | UpdateStorageLocationAction
    | DeleteStorageLocationAction
    | AddFarmerAction
    | UpdateFarmerAction
    | DeleteFarmerAction
    | ImportGlobalFarmersAction
    | AddBulkFarmersAction
    | AddUserAction
    | UpdateUserAction
    | DeleteUserAction
    | AddRoleAction
    | UpdateRoleAction
    | DeleteRoleAction
    | CloneRoleAction
    | GenerateContainersAction
    | DeleteContainerAction
    | AddAdvanceAction
    | AddBulkAdvancesAction
    | AddDeliveryAction
    | AddBulkDeliveriesAction
    | AddContainerAction
    | UpdateContainerAction
    | AssignContainersAction
    | InitializeBatchAction
    | CompleteProcessingStepAction
    | ApproveProcessingStepAction
    | ApproveContainerLoadingAction
    | SetOutsourcedCostAction
    | AddBatchMoistureMeasurementAction
    | UpdateBatchCuppingScoreAction
    | CompleteFloatingAction
    | MergeBatchesAction
    | PublishBuyingPricesAction
    | AddPaymentLineAction
    | UpdatePaymentLineStatusAction
    | UpdateGlobalSettingsAction
    | ApprovePaymentAccountantAction
    | ApprovePaymentDirectorAction
    | ExecutePaymentAction
    | ReceptionDeliveryAction
    | DeleteFinancingAction
    | CloseContainerAction
    | StartDryingAction
    | AddMoistureMeasurementAction
    | MoveToStorageAction
    | StartHullingAction
    | CompleteHullingAction
    | MoveBatchStockAction
    | AddSaleAction
    | TransferStockAction
    | UpdateEntryDateAction
    | BulkUpdateEntryDatesAction
    | SaveForecastSnapshotAction
    | DeleteForecastSnapshotAction
    | UpdateGlobalCurrencyAction
    | RecalculateUsdValuesAction
    | DeleteLogEntryAction
    | LoadDryingBedAction
    | HarvestDryingBedAction
    | PourBatchToBedAction
    | PutAwayBatchAction
    | ToggleBatchLockAction;