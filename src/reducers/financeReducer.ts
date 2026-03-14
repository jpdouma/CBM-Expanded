// ==> src/reducers/financeReducer.ts <==
import type { ProjectState, Project, PaymentLine, Delivery } from '../types';

const updateProjectInState = (state: ProjectState, projectId: string, updateFn: (project: Project) => Project): ProjectState => {
    return {
        ...state,
        projects: state.projects.map(p => (p.id === projectId ? updateFn(p) : p)),
    };
};

export const financeReducer = (state: ProjectState, action: any): ProjectState => {
    switch (action.type) {
        // --- SETUP COSTS ---
        case 'ADD_PROJECT_SETUP_COST':
            return updateProjectInState(state, action.payload.projectId, p => {
                const { cost } = action.payload;
                const amountUSD = cost.currency === 'USD' ? cost.amount : cost.amount / p.exchangeRateUGXtoUSD;
                return { ...p, setupCosts: [...(p.setupCosts || []), { ...cost, id: crypto.randomUUID(), amountUSD }] };
            });
        case 'UPDATE_PROJECT_SETUP_COST':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                setupCosts: p.setupCosts.map(c => c.id === action.payload.costId ?
                    { ...c, ...action.payload.updates, amountUSD: (action.payload.updates.currency || c.currency) === 'USD' ? (action.payload.updates.amount ?? c.amount) : (action.payload.updates.amount ?? c.amount) / p.exchangeRateUGXtoUSD }
                    : c)
            }));
        case 'REMOVE_PROJECT_SETUP_COST':
            return updateProjectInState(state, action.payload.projectId, p => ({
                ...p,
                setupCosts: p.setupCosts.filter(c => c.id !== action.payload.costId)
            }));

        // --- FINANCING ---
        case 'ADD_FINANCING':
            return updateProjectInState(state, action.payload.projectId, p => {
                const { data } = action.payload;
                const financier = state.financiers.find(f => f.id === data.financierId);
                if (!financier) return p;

                const currentDrawdown = p.financing.filter(f => f.financierId === data.financierId).reduce((sum, f) => sum + f.amountUSD, 0);
                if (currentDrawdown + data.amountUSD > financier.creditLimitUSD) {
                    alert(`Credit limit exceeded for ${financier.name}.`);
                    return p;
                }
                return { ...p, financing: [...p.financing, { ...data, id: crypto.randomUUID(), interestRateAnnual: financier.interestRateAnnual }] };
            });
        case 'DELETE_FINANCING': {
            const { projectId, eventId } = action.payload;
            return updateProjectInState(state, projectId, p => ({
                ...p,
                financing: p.financing.filter(f => f.id !== eventId)
            }));
        }

        // --- ADVANCES ---
        case 'ADD_ADVANCE': {
            const { projectId, data } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const amountUSD = data.currency === 'USD' ? data.amount : data.amount / project.exchangeRateUGXtoUSD;
            const advanceId = crypto.randomUUID();

            const newPaymentLine: PaymentLine = {
                id: crypto.randomUUID(),
                deliveryId: advanceId,
                farmerId: data.farmerId,
                amount: data.amount,
                currency: data.currency,
                status: 'PENDING_ACCOUNTANT',
                date: data.date
            };

            const updatedProject = {
                ...project,
                advances: [...project.advances, { ...data, id: advanceId, amountUSD }]
            };

            return {
                ...state,
                paymentLines: [...(state.paymentLines || []), newPaymentLine],
                projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
            };
        }
        case 'ADD_BULK_ADVANCES': {
            const { projectId, advancesData } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const newAdvances = [...project.advances];
            const newPaymentLines = [...(state.paymentLines || [])];
            const existingKeys = new Set(newAdvances.map(a => `${a.farmerId}-${a.date}-${a.amount}`));

            for (const d of advancesData) {
                const farmer = state.farmers.find(f => f.name.toLowerCase() === d.farmer_name?.trim().toLowerCase());
                if (!farmer) continue;
                const amt = parseFloat(d.amount);
                if (amt <= 0) continue;
                const key = `${farmer.id}-${d.date}-${amt}`;

                if (!existingKeys.has(key)) {
                    const cur = d.currency?.toUpperCase() === 'USD' ? 'USD' : 'UGX';
                    const advanceId = crypto.randomUUID();
                    const amountUSD = cur === 'USD' ? amt : amt / project.exchangeRateUGXtoUSD;

                    newAdvances.push({
                        id: advanceId,
                        farmerId: farmer.id,
                        date: d.date,
                        amount: amt,
                        currency: cur,
                        amountUSD
                    });

                    newPaymentLines.push({
                        id: crypto.randomUUID(),
                        deliveryId: advanceId,
                        farmerId: farmer.id,
                        amount: amt,
                        currency: cur,
                        status: 'PENDING_ACCOUNTANT',
                        date: d.date
                    });

                    existingKeys.add(key);
                }
            }

            return {
                ...state,
                paymentLines: newPaymentLines,
                projects: state.projects.map(p => p.id === projectId ? { ...project, advances: newAdvances } : p)
            };
        }

        // --- PAYMENT LINES & PIPELINE ---
        case 'ADD_PAYMENT_LINE':
            return {
                ...state,
                paymentLines: [...(state.paymentLines || []), { ...action.payload.data, id: crypto.randomUUID() }]
            };
        case 'UPDATE_PAYMENT_LINE_STATUS':
            return {
                ...state,
                paymentLines: (state.paymentLines || []).map(pl =>
                    pl.id === action.payload.paymentLineId
                        ? { ...pl, status: action.payload.status, authCode: action.payload.authCode || pl.authCode }
                        : pl
                )
            };
        case 'APPROVE_PAYMENT_ACCOUNTANT': {
            return {
                ...state,
                paymentLines: (state.paymentLines || []).map(pl =>
                    pl.id === action.payload.paymentLineId
                        ? { ...pl, status: 'PENDING_DIRECTOR' }
                        : pl
                )
            };
        }
        case 'APPROVE_PAYMENT_DIRECTOR': {
            return {
                ...state,
                paymentLines: (state.paymentLines || []).map(pl =>
                    pl.id === action.payload.paymentLineId
                        ? { ...pl, status: 'APPROVED_FOR_EXECUTION', authCode: action.payload.authCode }
                        : pl
                )
            };
        }
        case 'EXECUTE_PAYMENT': {
            return {
                ...state,
                paymentLines: (state.paymentLines || []).filter(pl => pl.id !== action.payload.paymentLineId)
            };
        }

        // --- CHERRY RECEPTION & PAYMENTS ---
        case 'RECEPTION_DELIVERY': {
            const { projectId, farmerId, date, weight, unripe, earlyRipe, optimal, overRipe } = action.payload;
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return state;

            const today = new Date(date).getTime();
            const activePrices = (state.buyingPrices || []).find(p => {
                const start = new Date(p.validFrom).getTime();
                const end = new Date(p.validTo).getTime();
                return today >= start && today <= end;
            });

            if (!activePrices) return state;

            const payout = (weight * (unripe / 100) * activePrices.unripe) +
                (weight * (earlyRipe / 100) * activePrices.earlyRipe) +
                (weight * (optimal / 100) * activePrices.optimal) +
                (weight * (overRipe / 100) * activePrices.overRipe);

            const deliveryId = crypto.randomUUID();
            const costUSD = activePrices.currency === 'USD' ? payout : payout / project.exchangeRateUGXtoUSD;

            const farmerAdvances = project.advances.filter(a => a.farmerId === farmerId).reduce((s, a) => s + a.amountUSD, 0);
            const priorOffsets = project.deliveries.filter(d => d.farmerId === farmerId).reduce((s, d) => s + d.advanceOffsetUSD, 0);

            const advanceOffsetUSD = Math.min(farmerAdvances - priorOffsets, costUSD);
            const amountPaidUSD = costUSD - advanceOffsetUSD;

            const delivery: Delivery = {
                id: deliveryId, farmerId, date, weight, unripePercentage: unripe, earlyRipePercentage: earlyRipe, optimalPercentage: optimal, overRipePercentage: overRipe, cost: payout, currency: activePrices.currency, costUSD, advanceOffsetUSD, amountPaidUSD
            };

            const paymentLine: PaymentLine = {
                id: crypto.randomUUID(), deliveryId, farmerId, amount: payout, currency: activePrices.currency, status: 'PENDING_ACCOUNTANT', date
            };

            return {
                ...state,
                paymentLines: [...(state.paymentLines || []), paymentLine],
                projects: state.projects.map(p => p.id === projectId ? { ...p, deliveries: [...p.deliveries, delivery] } : p)
            };
        }

        // --- SUPER ADMIN DATA WIPE ---
        case 'WIPE_PROJECT_DATA': {
            const { deliveryIds, advanceIds, batchIds } = action.payload;
            const idsToRemove = new Set([...deliveryIds, ...advanceIds, ...batchIds]);

            return {
                ...state,
                paymentLines: (state.paymentLines || []).filter(pl => !idsToRemove.has(pl.deliveryId))
            };
        }

        default:
            return state;
    }
};