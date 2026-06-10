import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/adminAuth';
import { MarketingShell } from '@/components/marketing/MarketingShell';

export const dynamic = 'force-dynamic';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const access = await getAdminAccess();
    if (!access.userId) redirect('/login');
    if (!access.isAdmin) redirect('/');
    return <MarketingShell>{children}</MarketingShell>;
}
