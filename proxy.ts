import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { requiresReceiptConsent } from '@/lib/receiptBilling';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { CLERK_PUBLIC_ROUTES } from '@/lib/routes';

const isPublicRoute = createRouteMatcher([
    ...CLERK_PUBLIC_ROUTES.map(route => `${route}(.*)`),
    '/api/webhooks(.*)',
    '/api/notifications/send(.*)', // Permitir notificações disparadas pelo servidor de chat
    '/api/auth/asaas-bypass(.*)',  // Permitir chamada de bypass de autenticação do Asaas
    '/manifest.json',
    '/firebase-messaging-sw.js',
    '/.well-known/(.*)',
    '/api/creator-applications(.*)',
    '/api/campaigns/visit(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
        const { userId } = await auth.protect();
        const path = req.nextUrl.pathname;
        const consentExempt = path === '/api/users/me' || path === '/api/users/me/receipt-consent' || path === '/api/settings/chat-pricing';
        if (path.startsWith('/api/') && !consentExempt) {
            await connectToDatabase();
            const user = await User.findOne({ clerkId: userId }).select('isProfessional isTeam receiptTermsVersion receiptTermsAcceptedAt').lean();
            if (requiresReceiptConsent(user)) return NextResponse.json({ error: 'Aceite os termos atualizados para continuar.', code: 'RECEIPT_CONSENT_REQUIRED' }, { status: 403 });
        }
    }
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
