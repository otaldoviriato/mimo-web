'use client';

import React from 'react';
import { SettingsAppPage } from '@/components/admin/settings/SettingsAppPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsAppPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsAppPage
            pwaShowAgainIntervalDays={settings.pwaShowAgainIntervalDays}
            setPwaShowAgainIntervalDays={settings.setPwaShowAgainIntervalDays}
            identityVerificationPromptIntervalDays={settings.identityVerificationPromptIntervalDays}
            setIdentityVerificationPromptIntervalDays={settings.setIdentityVerificationPromptIntervalDays}
            isDirtyApp={settings.isDirtyApp}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
