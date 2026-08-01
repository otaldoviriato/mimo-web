'use client';

import React from 'react';
import { FinancialTab } from '@/components/admin/FinancialTab';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminFinancialPage() {
    const { dashboardData, loadingDashboard, handleDeleteTransaction } = useAdminContext();

    return (
        <div className="w-full">
            <FinancialTab
                dashboardData={dashboardData}
                loadingDashboard={loadingDashboard}
                handleDeleteTransaction={handleDeleteTransaction}
            />
        </div>
    );
}
