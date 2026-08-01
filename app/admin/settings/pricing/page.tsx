'use client';

import React from 'react';
import { SettingsPricingPage } from '@/components/admin/settings/SettingsPricingPage';
import { useAdminContext } from '@/context/AdminSettingsContext';

export default function AdminSettingsPricingPage() {
    const { settings } = useAdminContext();

    return (
        <SettingsPricingPage
            maxPricePerChar={settings.maxPricePerChar}
            setMaxPricePerChar={settings.setMaxPricePerChar}
            defaultPricePerCharNonSubscribers={settings.defaultPricePerCharNonSubscribers}
            setDefaultPricePerCharNonSubscribers={settings.setDefaultPricePerCharNonSubscribers}
            defaultPricePerCharSubscribers={settings.defaultPricePerCharSubscribers}
            setDefaultPricePerCharSubscribers={settings.setDefaultPricePerCharSubscribers}
            minSubscriptionPrice={settings.minSubscriptionPrice}
            setMinSubscriptionPrice={settings.setMinSubscriptionPrice}
            maxSubscriptionPrice={settings.maxSubscriptionPrice}
            setMaxSubscriptionPrice={settings.setMaxSubscriptionPrice}
            subscriberDiscountPercentage={settings.subscriberDiscountPercentage}
            setSubscriberDiscountPercentage={settings.setSubscriberDiscountPercentage}
            audioPriceMultiplier={settings.audioPriceMultiplier}
            setAudioPriceMultiplier={settings.setAudioPriceMultiplier}
            isDirtyPricing={settings.isDirtyPricing}
            saving={settings.saving}
            saveSettings={settings.saveSettings}
        />
    );
}
