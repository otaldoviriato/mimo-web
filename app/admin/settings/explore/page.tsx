'use client';

import React from 'react';
import { SettingsExplorePage } from '@/components/admin/settings/SettingsExplorePage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsExplorePage() {
    const { settings } = useAdminContext();

    return (
        <SettingsExplorePage
            exploreSortingCriteria={settings.exploreSortingCriteria}
            setExploreSortingCriteria={settings.setExploreSortingCriteria}
            isDirtyExplore={settings.isDirtyExplore}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
