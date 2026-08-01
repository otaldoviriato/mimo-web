'use client';

import React from 'react';
import { SettingsProfilesPage } from '@/components/admin/settings/SettingsProfilesPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsProfilesPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsProfilesPage
            minPublicPhotos={settings.minPublicPhotos}
            setMinPublicPhotos={settings.setMinPublicPhotos}
            maxPublicPhotos={settings.maxPublicPhotos}
            setMaxPublicPhotos={settings.setMaxPublicPhotos}
            minExclusivePhotos={settings.minExclusivePhotos}
            setMinExclusivePhotos={settings.setMinExclusivePhotos}
            maxExclusivePhotos={settings.maxExclusivePhotos}
            setMaxExclusivePhotos={settings.setMaxExclusivePhotos}
            newProfileDaysThreshold={settings.newProfileDaysThreshold}
            setNewProfileDaysThreshold={settings.setNewProfileDaysThreshold}
            newClientHoursThreshold={settings.newClientHoursThreshold}
            setNewClientHoursThreshold={settings.setNewClientHoursThreshold}
            activeRechargedClientDaysThreshold={settings.activeRechargedClientDaysThreshold}
            setActiveRechargedClientDaysThreshold={settings.setActiveRechargedClientDaysThreshold}
            activeUnrechargedClientHoursThreshold={settings.activeUnrechargedClientHoursThreshold}
            setActiveUnrechargedClientHoursThreshold={settings.setActiveUnrechargedClientHoursThreshold}
            isDirtyProfiles={settings.isDirtyProfiles}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
