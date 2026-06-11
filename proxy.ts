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
    '/api/marketing/copilot(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
