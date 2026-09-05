'use client';

import { PolicyConsentModal } from './PolicyConsentModal';
import { CURRENT_POLICY } from '@/lib/policies';

export function ReceiptConsentModal({ onAccepted }: { onAccepted: () => Promise<unknown> }) {
    return <PolicyConsentModal policy={CURRENT_POLICY} onAccepted={onAccepted} />;
}

