import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectProvider';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { PaymentLine } from '../../types';

export const AccountantDashboard: React.FC = () => {
    const { state, dispatch } = useProjects();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Record<string, string>>({});

    const pendingAccountant = (state.paymentLines || []).filter(pl => pl.status === 'PENDING_ACCOUNTANT');
    const approvedForExecution = (state.paymentLines || []).filter(pl => pl.status === 'APPROVED_FOR_EXECUTION');

    const handleApprove = (paymentLineId: string) => {
        dispatch({ type: 'APPROVE_PAYMENT_ACCOUNTANT', payload: { paymentLineId } });
    };

    const handleExecute = (paymentLineId: string) => {
        const method = selectedPaymentMethod[paymentLineId];
        if (!method) {
            alert("Please select a payment method.");
            return;
        }
        dispatch({ type: 'EXECUTE_PAYMENT', payload: { paymentLineId, paymentMethod: method } });
    };

    const renderPaymentRow = (pl: PaymentLine, isExecution: boolean) => {
        const farmer = state.farmers.find(f => f.id === pl.farmerId);
        const farmerName = farmer ? farmer.name : (pl.farmerId === 'OUTSOURCED' ? 'Outsourced Service' : 'Unknown');

        return (
            <div key={pl.id} className="flex items-center justify-between p-4 border-b last:border-0">
                <div>
                    <p className="font-medium text-gray-900">{farmerName}</p>
                    <p className="text-sm text-gray-500">{pl.date} • {pl.currency} {pl.amount.toLocaleString()}</p>
                    {pl.authCode && <p className="text-xs text-green-600 mt-1">Auth Code: {pl.authCode}</p>}
                </div>
                <div className="flex items-center gap-4">
                    {isExecution ? (
                        <>
                            <select 
                                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={selectedPaymentMethod[pl.id] || ''}
                                onChange={(e) => setSelectedPaymentMethod(prev => ({ ...prev, [pl.id]: e.target.value }))}
                            >
                                <option value="" disabled>Select Method</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Airtel Money">Airtel Money</option>
                                <option value="MTN Mobile Money">MTN Mobile Money</option>
                                <option value="Cash">Cash</option>
                            </select>
                            <Button size="sm" onClick={() => handleExecute(pl.id)}>Execute Payment</Button>
                        </>
                    ) : (
                        <Button size="sm" onClick={() => handleApprove(pl.id)}>Send to Director</Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Pending Review (Accountant)
                        <Badge variant="secondary">{pendingAccountant.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {pendingAccountant.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No payments pending review.</p>
                    ) : (
                        <div className="divide-y">
                            {pendingAccountant.map(pl => renderPaymentRow(pl, false))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Ready for Execution
                        <Badge variant="secondary">{approvedForExecution.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {approvedForExecution.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No payments ready for execution.</p>
                    ) : (
                        <div className="divide-y">
                            {approvedForExecution.map(pl => renderPaymentRow(pl, true))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export const DirectorDashboard: React.FC = () => {
    const { state, dispatch } = useProjects();
    const [authCodes, setAuthCodes] = useState<Record<string, string>>({});

    const pendingDirector = (state.paymentLines || []).filter(pl => pl.status === 'PENDING_DIRECTOR');

    const handleApprove = (paymentLineId: string) => {
        const code = authCodes[paymentLineId];
        if (!code || code.trim() === '') {
            alert("Authorization code is required.");
            return;
        }
        dispatch({ type: 'APPROVE_PAYMENT_DIRECTOR', payload: { paymentLineId, authCode: code } });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Pending Approval (Director)
                    <Badge variant="secondary">{pendingDirector.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {pendingDirector.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No payments pending approval.</p>
                ) : (
                    <div className="divide-y">
                        {pendingDirector.map(pl => {
                            const farmer = state.farmers.find(f => f.id === pl.farmerId);
                            const farmerName = farmer ? farmer.name : (pl.farmerId === 'OUTSOURCED' ? 'Outsourced Service' : 'Unknown');

                            return (
                                <div key={pl.id} className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium text-gray-900">{farmerName}</p>
                                        <p className="text-sm text-gray-500">{pl.date} • {pl.currency} {pl.amount.toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Input 
                                            type="text" 
                                            placeholder="Auth Code" 
                                            className="w-32 h-8 text-sm"
                                            value={authCodes[pl.id] || ''}
                                            onChange={(e) => setAuthCodes(prev => ({ ...prev, [pl.id]: e.target.value }))}
                                        />
                                        <Button size="sm" onClick={() => handleApprove(pl.id)}>Approve</Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
