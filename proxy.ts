import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { MAINTENANCE_HTML } from '@/lib/maintenance';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { requiresReceiptConsent } from '@/lib/receiptBilling';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { CLERK_PUBLIC_ROUTES } from '@/lib/routes';

const isPublicRoute = createRouteMatcher([
    ...CLERK_PUBLIC_ROUTES.map(route => `${route}(.*)`),
    '/api/webhooks(.*)',
    '/api/notifications/send(.*)',
    '/api/auth/asaas-bypass(.*)',
    '/manifest.json',
    '/firebase-messaging-sw.js',
    '/.well-known/(.*)',
    '/api/participar/intencao',
    '/api/creator-applications(.*)',
    '/api/campaigns/visit(.*)',
    '/api/users/featured(.*)',
    '/api/users/username/(.*)',
    '/api/users/(.*)/gallery',
    '/search(.*)',
    '/chat/(.*)',
    '/:username',
    '/:username/chat',
    '/:username/chat/(.*)',
]);

const authenticatedProxy = clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
        const { userId } = await auth.protect();
        const path = req.nextUrl.pathname;
        const consentExempt = path === '/api/users/me' || path === '/api/users/me/receipt-consent' || path === '/api/settings/chat-pricing';
        if (path.startsWith('/api/') && !consentExempt) {
            await connectToDatabase();
            const user = await User.findOne({ clerkId: userId }).select('isProfessional isTeam receiptTermsVersion receiptTermsAcceptedAt createdAt').lean();
            if (requiresReceiptConsent(user)) return NextResponse.json({ error: 'Aceite os termos atualizados para continuar.', code: 'RECEIPT_CONSENT_REQUIRED' }, { status: 403 });
        }
    }
});

export default function proxy(req: NextRequest, event: NextFetchEvent) {
    const path = req.nextUrl.pathname;
    // Keep API callbacks, webhooks and scheduled jobs running during maintenance.
    if (path === '/api' || path.startsWith('/api/') || path === '/trpc' || path.startsWith('/trpc/') || path === '/manifest.json' || path.startsWith('/.well-known/')) {
        return authenticatedProxy(req, event);
    }

    return new NextResponse(req.method === 'HEAD' ? null : MAINTENANCE_HTML, {
        status: 503,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, max-age=0',
            'Retry-After': '3600',
        },
    });
}

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
