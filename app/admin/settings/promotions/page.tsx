'use client';

import React from 'react';
import { SettingsPromotionsPage } from '@/components/admin/settings/SettingsPromotionsPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsPromotionsPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsPromotionsPage
            welcomeBonusEnabled={settings.welcomeBonusEnabled}
            setWelcomeBonusEnabled={settings.setWelcomeBonusEnabled}
            welcomeBonusAmountCents={settings.welcomeBonusAmountCents}
            setWelcomeBonusAmountCents={settings.setWelcomeBonusAmountCents}
            welcomeBonusUrlParamKey={settings.welcomeBonusUrlParamKey}
            setWelcomeBonusUrlParamKey={settings.setWelcomeBonusUrlParamKey}
            welcomeBonusUrlParamValue={settings.welcomeBonusUrlParamValue}
            setWelcomeBonusUrlParamValue={settings.setWelcomeBonusUrlParamValue}
            welcomeBonusLimitByIp={settings.welcomeBonusLimitByIp}
            setWelcomeBonusLimitByIp={settings.setWelcomeBonusLimitByIp}
            welcomeBonusBlockSameIpChat={settings.welcomeBonusBlockSameIpChat}
            setWelcomeBonusBlockSameIpChat={settings.setWelcomeBonusBlockSameIpChat}
            defaultPricePerCharNonSubscribers={settings.defaultPricePerCharNonSubscribers}
            isDirtyPromotions={settings.isDirtyPromotions}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
