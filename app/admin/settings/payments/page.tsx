'use client';

import React from 'react';
import { SettingsPaymentsPage } from '@/components/admin/settings/SettingsPaymentsPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsPaymentsPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsPaymentsPage
            pixEnabled={settings.pixEnabled}
            setPixEnabled={settings.setPixEnabled}
            creditCardEnabled={settings.creditCardEnabled}
            setCreditCardEnabled={settings.setCreditCardEnabled}
            couponsEnabled={settings.couponsEnabled}
            setCouponsEnabled={settings.setCouponsEnabled}
            isDirtyPayments={settings.isDirtyPayments}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
