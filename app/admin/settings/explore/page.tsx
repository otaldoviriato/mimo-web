'use client';

import React from 'react';
import { SettingsExplorePage } from '@/components/admin/settings/SettingsExplorePage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsExplorePage() {
    const { settings } = useAdminContext();

    return (
        <SettingsExplorePage
            availabilityResponseTimeMinutes={settings.availabilityResponseTimeMinutes}
            setAvailabilityResponseTimeMinutes={settings.setAvailabilityResponseTimeMinutes}
            availabilityDurationHours={settings.availabilityDurationHours}
            setAvailabilityDurationHours={settings.setAvailabilityDurationHours}
            isDirtyExplore={settings.isDirtyExplore}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
