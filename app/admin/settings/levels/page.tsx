'use client';

import React from 'react';
import { SettingsLevelsPage } from '@/components/admin/settings/SettingsLevelsPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsLevelsPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsLevelsPage
            clientLevels={settings.clientLevels}
            setClientLevels={settings.setClientLevels}
            isDirtyLevels={settings.isDirtyLevels}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
