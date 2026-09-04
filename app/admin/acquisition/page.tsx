import { redirect } from 'next/navigation';

export default function LegacyAcquisitionPage() {
    redirect('/admin/campaigns');
}
