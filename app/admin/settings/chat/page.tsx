'use client';

import React from 'react';
import { SettingsChatPage } from '@/components/admin/settings/SettingsChatPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsChatPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsChatPage
            freeIntroReplyLimit={settings.freeIntroReplyLimit}
            setFreeIntroReplyLimit={settings.setFreeIntroReplyLimit}
            freeIntroTimeoutMinutes={settings.freeIntroTimeoutMinutes}
            setFreeIntroTimeoutMinutes={settings.setFreeIntroTimeoutMinutes}
            chatSessionTimeoutMinutes={settings.chatSessionTimeoutMinutes}
            setChatSessionTimeoutMinutes={settings.setChatSessionTimeoutMinutes}
            earningsSessionInactivityMinutes={settings.earningsSessionInactivityMinutes}
            setEarningsSessionInactivityMinutes={settings.setEarningsSessionInactivityMinutes}
            earningsSessionMinimumCents={settings.earningsSessionMinimumCents}
            setEarningsSessionMinimumCents={settings.setEarningsSessionMinimumCents}
            lowBalanceThresholdInCents={settings.lowBalanceThresholdInCents}
            setLowBalanceThresholdInCents={settings.setLowBalanceThresholdInCents}
            onlineDelayMinutes={settings.onlineDelayMinutes}
            setOnlineDelayMinutes={settings.setOnlineDelayMinutes}
            offlineEmailDelayMinutes={settings.offlineEmailDelayMinutes}
            setOfflineEmailDelayMinutes={settings.setOfflineEmailDelayMinutes}
            offlineEmailCooldownMinutes={settings.offlineEmailCooldownMinutes}
            setOfflineEmailCooldownMinutes={settings.setOfflineEmailCooldownMinutes}
            activeUserThresholdDays={settings.activeUserThresholdDays}
            setActiveUserThresholdDays={settings.setActiveUserThresholdDays}
            isDirtyChat={settings.isDirtyChat}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
