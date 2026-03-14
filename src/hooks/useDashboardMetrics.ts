// ==> src/hooks/useDashboardMetrics.ts <==
import { useMemo } from 'react';
import type { Project, Financier, Farmer } from '../types';
import { formatDate } from '../utils/formatters';
import type { WaterfallChartData } from '../components/dashboard/CashFlowWaterfallChart';

export const useDashboardMetrics = (
    projects: Project[],
    allFinanciers: Financier[],
    allFarmers: Farmer[],
    startDate: string,
    endDate: string,
    excludeSetupCostsFromMargin: boolean
) => {
    const financialSummary = useMemo(() => {
        // Safety helper to avoid NaN pollution
        const safeVal = (n: number | undefined | null) => (n !== undefined && n !== null && !isNaN(n) && isFinite(n)) ? n : 0;

        let actualRevenue = 0;
        let totalFinancing = 0;
        let totalPurchases = 0;
        let totalSetupCosts = 0;
        let totalAdvances = 0;

        let projectedRevenue = 0;
        let projectedTotalCosts = 0;

        let valueRawMaterial = 0;
        let valueInProcess = 0;
        let valueReadyForSale = 0;

        projects.forEach(p => {
            actualRevenue += (p.sales || []).reduce((sum, s) => sum + safeVal(s.totalSaleAmountUSD), 0);
            totalFinancing += (p.financing || []).reduce((sum, f) => sum + safeVal(f.amountUSD), 0);
            totalAdvances += (p.advances || []).reduce((sum, a) => sum + safeVal(a.amountUSD), 0);
            totalPurchases += (p.deliveries || []).reduce((sum, d) => sum + safeVal(d.amountPaidUSD), 0);
            totalSetupCosts += (p.setupCosts || []).reduce((sum, sc) => sum + safeVal(sc.amountUSD), 0);

            const exchangeRate = p.exchangeRateUGXtoUSD && p.exchangeRateUGXtoUSD > 0 ? p.exchangeRateUGXtoUSD : 3750;
            const pricePerKgUSD = p.targetSalePriceCurrency === 'USD'
                ? safeVal(p.targetSalePricePerKg)
                : safeVal(p.targetSalePricePerKg) / exchangeRate;

            const pTotalDeliveryCostUSD = (p.deliveries || []).reduce((sum, d) => sum + safeVal(d.costUSD), 0);
            const pTotalDeliveredCherryMass = (p.deliveries || []).reduce((sum, d) => sum + safeVal(d.weight), 0);

            // Calculate weighted average cost of cherry so far
            const avgCostPerKgCherry = pTotalDeliveredCherryMass > 0
                ? pTotalDeliveryCostUSD / pTotalDeliveredCherryMass
                : safeVal(p.estCostPerKgCherryUSD);

            // --- INVENTORY VALUATION ---
            const soldBatchIds = new Set((p.sales || []).flatMap(s => s.processingBatchIds || []));
            let totalBatchCherryWeight = 0;

            (p.processingBatches || []).forEach(batch => {
                const batchCherryWeight = (batch.traceabilitySnapshot || []).reduce((sum, s) => sum + safeVal(s.weightKg), 0);
                totalBatchCherryWeight += batchCherryWeight;

                if (batch.currentStage === 'EXPORT_READY') {
                    if (!soldBatchIds.has(batch.id)) {
                        // Ready for sale is valued at target market price
                        valueReadyForSale += safeVal(batch.weight) * pricePerKgUSD;
                    }
                } else if (batch.status !== 'COMPLETED') {
                    // In-process is valued at raw material cost equivalent
                    valueInProcess += batchCherryWeight * avgCostPerKgCherry;
                }
            });

            // Raw material is any delivered cherry not yet dumped into a processing batch
            const unassignedCherryWeight = Math.max(0, pTotalDeliveredCherryMass - totalBatchCherryWeight);
            valueRawMaterial += unassignedCherryWeight * avgCostPerKgCherry;

            // --- REVENUE PROJECTION ---
            const pActualRevenue = (p.sales || []).reduce((sum, s) => sum + safeVal(s.totalSaleAmountUSD), 0);

            // Calculate total green bean volume sold
            const pVolumeSold = (p.sales || []).reduce((sSum, sale) => {
                const saleWeight = (sale.processingBatchIds || []).reduce((bSum, bId) => {
                    const batch = (p.processingBatches || []).find(hb => hb.id === bId);
                    return bSum + safeVal(batch?.weight);
                }, 0);
                return sSum + saleWeight;
            }, 0);

            // Calculate remaining revenue to be realized
            const pRemainingVolumeToSell = Math.max(0, safeVal(p.requiredGreenBeanMassKg) - pVolumeSold);
            const pProjectedRemainingRevenue = pRemainingVolumeToSell * pricePerKgUSD;

            projectedRevenue += pActualRevenue + pProjectedRemainingRevenue;

            // --- COST PROJECTION ---
            const pTotalSetupCostsUSD = (p.setupCosts || []).reduce((sum, sc) => sum + safeVal(sc.amountUSD), 0);
            const totalRequiredCherryMass = safeVal(p.requiredGreenBeanMassKg) * (p.estShrinkFactor && p.estShrinkFactor > 0 ? p.estShrinkFactor : 6.25);
            const remainingCherryToBuy = Math.max(0, totalRequiredCherryMass - pTotalDeliveredCherryMass);

            const futureCherryCost = remainingCherryToBuy * avgCostPerKgCherry;

            let pProjectedCosts = pTotalDeliveryCostUSD + futureCherryCost;
            if (!excludeSetupCostsFromMargin) {
                pProjectedCosts += pTotalSetupCostsUSD;
            }
            projectedTotalCosts += pProjectedCosts;
        });

        const projectedGrossMargin = projectedRevenue > 0
            ? ((projectedRevenue - projectedTotalCosts) / projectedRevenue) * 100
            : 0;

        const totalOutflow = totalPurchases + totalSetupCosts + totalAdvances;
        const netCashflow = actualRevenue + totalFinancing - totalOutflow;
        const totalInventoryValue = valueRawMaterial + valueInProcess + valueReadyForSale;

        return {
            actualRevenue,
            projectedRevenue,
            projectedGrossMargin,
            totalFinancing,
            totalOutflow,
            netCashflow,
            valueRawMaterial,
            valueInProcess,
            valueReadyForSale,
            totalInventoryValue
        };
    }, [projects, excludeSetupCostsFromMargin]);

    const waterfallChartData = useMemo((): WaterfallChartData[] => {
        // Safety helper
        const safeVal = (n: number | undefined | null) => (n !== undefined && n !== null && !isNaN(n) && isFinite(n)) ? n : 0;

        if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) return [];

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        const allEvents: { date: Date; amount: number; label: string; kgValue?: number; type: 'inflow' | 'outflow', description: string }[] = [];

        const getGlobalFinancierName = (financierId: string) => allFinanciers.find(f => f.id === financierId)?.name || 'Unknown';

        projects.forEach(p => {
            const getFarmerName = (farmerId: string) => {
                const f = allFarmers.find(f => f.id === farmerId) || (p.farmers || []).find(f => f.id === farmerId);
                return f?.name || 'Unknown Farmer';
            };

            (p.setupCosts || []).forEach(sc => allEvents.push({ date: new Date(sc.date), amount: -safeVal(sc.amountUSD), label: 'Setup Cost', type: 'outflow', description: sc.description }));
            (p.advances || []).forEach(a => allEvents.push({ date: new Date(a.date), amount: -safeVal(a.amountUSD), label: 'Advance', type: 'outflow', description: `To ${getFarmerName(a.farmerId)}` }));
            (p.deliveries || []).forEach(d => { if (d.amountPaidUSD > 0) allEvents.push({ date: new Date(d.date), amount: -safeVal(d.amountPaidUSD), label: 'Purchase', kgValue: safeVal(d.weight), type: 'outflow', description: `${d.weight}kg from ${getFarmerName(d.farmerId)}` }); });
            (p.sales || []).forEach(s => allEvents.push({ date: new Date(s.invoiceDate), amount: safeVal(s.totalSaleAmountUSD), label: `Sale`, type: 'inflow', description: `To ${s.clientName}` }));
            (p.financing || []).forEach(f => allEvents.push({ date: new Date(f.date), amount: safeVal(f.amountUSD), label: 'Financing', type: 'inflow', description: `From ${getGlobalFinancierName(f.financierId)}` }));
        });

        allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

        const preRangeBalance = allEvents.filter(e => e.date < start).reduce((sum, e) => sum + e.amount, 0);
        const eventsInRange = allEvents.filter(e => e.date >= start && e.date <= end);

        const aggregatedEventsMap = new Map<string, { date: Date; amount: number; label: string; kgValue: number; type: 'inflow' | 'outflow'; descriptions: string[] }>();

        eventsInRange.forEach(event => {
            const dateString = event.date.toISOString().split('T')[0];
            const key = `${dateString}-${event.label}`;
            if (aggregatedEventsMap.has(key)) {
                const existing = aggregatedEventsMap.get(key)!;
                existing.amount += event.amount;
                existing.kgValue += event.kgValue || 0;
                existing.descriptions.push(event.description);
            } else {
                aggregatedEventsMap.set(key, {
                    date: event.date,
                    amount: event.amount,
                    label: event.label,
                    kgValue: event.kgValue || 0,
                    type: event.type,
                    descriptions: [event.description],
                });
            }
        });

        const sortedAggregatedEvents = Array.from(aggregatedEventsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

        let waterfallData: WaterfallChartData[] = [];
        waterfallData.push({ type: 'start', label: 'Start Balance', value: preRangeBalance, startBalance: 0, endBalance: preRangeBalance, date: start, descriptions: [`Balance before ${formatDate(start)}`] });

        let currentBalance = preRangeBalance;

        sortedAggregatedEvents.forEach(event => {
            const startBalance = currentBalance;
            currentBalance += event.amount;
            waterfallData.push({
                type: event.type,
                label: event.label,
                value: event.amount,
                startBalance: startBalance,
                endBalance: currentBalance,
                kgValue: event.kgValue,
                date: event.date,
                descriptions: event.descriptions
            });
        });

        waterfallData.push({ type: 'end', label: 'End Balance', value: currentBalance, startBalance: currentBalance, endBalance: currentBalance, date: end, descriptions: [`Balance as of ${formatDate(end)}`] });

        return waterfallData;
    }, [projects, startDate, endDate, allFinanciers, allFarmers]);

    return { financialSummary, waterfallChartData };
};