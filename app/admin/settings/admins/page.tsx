'use client';

import React from 'react';
import { SettingsAdminsPage } from '@/components/admin/settings/SettingsAdminsPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsAdminsPage() {
    const { settings, userId } = useAdminContext();

    return (
        <SettingsAdminsPage
            adminListRich={settings.adminListRich}
            adminSearch={settings.adminSearch}
            setAdminSearch={settings.setAdminSearch}
            adminSearchResults={settings.adminSearchResults}
            showAdminDropdown={settings.showAdminDropdown}
            setShowAdminDropdown={settings.setShowAdminDropdown}
            searchingAdmin={settings.searchingAdmin}
            handleSelectAdmin={settings.handleSelectAdmin}
            handleRemoveAdmin={settings.handleRemoveAdmin}
            isDirtyAdmins={settings.isDirtyAdmins}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
            userId={userId}
        />
    );
}
