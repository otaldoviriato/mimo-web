'use client';

import React from 'react';
import { SettingsPlatformPage } from '@/components/admin/settings/SettingsPlatformPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsPlatformPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsPlatformPage
            platformFee={settings.platformFee}
            setPlatformFee={settings.setPlatformFee}
            uploadLimit={settings.uploadLimit}
            setUploadLimit={settings.setUploadLimit}
            comparisonPeriod={settings.comparisonPeriod}
            setComparisonPeriod={settings.setComparisonPeriod}
            isDirtyPlatform={settings.isDirtyPlatform}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
