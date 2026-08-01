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
            creatorEngagementEmailsEnabled={settings.creatorEngagementEmailsEnabled}
            setCreatorEngagementEmailsEnabled={settings.setCreatorEngagementEmailsEnabled}
            creatorEngagementStep1Enabled={settings.creatorEngagementStep1Enabled}
            setCreatorEngagementStep1Enabled={settings.setCreatorEngagementStep1Enabled}
            creatorEngagementStep1Hours={settings.creatorEngagementStep1Hours}
            setCreatorEngagementStep1Hours={settings.setCreatorEngagementStep1Hours}
            creatorEngagementStep2Enabled={settings.creatorEngagementStep2Enabled}
            setCreatorEngagementStep2Enabled={settings.setCreatorEngagementStep2Enabled}
            creatorEngagementStep2Hours={settings.creatorEngagementStep2Hours}
            setCreatorEngagementStep2Hours={settings.setCreatorEngagementStep2Hours}
            isDirtyApp={settings.isDirtyApp}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
