'use client';

import React from 'react';
import { SettingsFreeIntroPage } from '@/components/admin/settings/SettingsFreeIntroPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsFreeIntroPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsFreeIntroPage
            freeIntroReplyLimit={settings.freeIntroReplyLimit}
            setFreeIntroReplyLimit={settings.setFreeIntroReplyLimit}
            isDirtyFreeIntro={settings.isDirtyFreeIntro}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
