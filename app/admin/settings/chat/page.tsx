'use client';

import React from 'react';
import { SettingsChatPage } from '@/components/admin/settings/SettingsChatPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsChatPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsChatPage
            chatSessionTimeoutMinutes={settings.chatSessionTimeoutMinutes}
            setChatSessionTimeoutMinutes={settings.setChatSessionTimeoutMinutes}
            lowBalanceThresholdInCents={settings.lowBalanceThresholdInCents}
            setLowBalanceThresholdInCents={settings.setLowBalanceThresholdInCents}
            onlineDelayMinutes={settings.onlineDelayMinutes}
            setOnlineDelayMinutes={settings.setOnlineDelayMinutes}
            activeUserThresholdDays={settings.activeUserThresholdDays}
            setActiveUserThresholdDays={settings.setActiveUserThresholdDays}
            isDirtyChat={settings.isDirtyChat}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
