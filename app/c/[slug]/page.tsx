import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectToDatabase } from '@/lib/db';
import { Campaign } from '@/models/Campaign';
import { User } from '@/models/User';
import { MessageSquare, ShieldCheck, ArrowRight, Star } from 'lucide-react';
import { CampaignVisitTracker } from '@/components/CampaignVisitTracker';

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params;
    await connectToDatabase();
    const campaign = await Campaign.findOne({ slug: slug.toLowerCase() }).lean();
    if (!campaign) {
        return { title: 'MimoChat' };
    }
    return {
        title: `${campaign.landingHeadline} | MimoChat`,
        description: campaign.landingBody,
    };
}

export default async function CampaignLandingPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;

    await connectToDatabase();

    const campaign = await Campaign.findOne({ slug: slug.toLowerCase() }).lean();

    if (!campaign || campaign.status !== 'active') {
        notFound();
    }

    let targetProfessional = null;
    if (campaign.targetProfessionalId) {
        targetProfessional = await User.findOne({ clerkId: campaign.targetProfessionalId })
            .select('clerkId username name photoUrl coverUrl bio state city')
            .lean();
    }

    const clickId = typeof resolvedSearchParams.click_id === 'string' ? resolvedSearchParams.click_id : undefined;
    const site = typeof resolvedSearchParams.site === 'string' ? resolvedSearchParams.site : undefined;
    const zone = typeof resolvedSearchParams.zone === 'string' ? resolvedSearchParams.zone : undefined;
    const creative = typeof resolvedSearchParams.creative === 'string' ? resolvedSearchParams.creative : undefined;
    const variation = typeof resolvedSearchParams.variation === 'string' ? resolvedSearchParams.variation : undefined;
    const utm = Object.fromEntries(Object.entries(resolvedSearchParams)
        .filter(([key, value]) => key.startsWith('utm_') && typeof value === 'string') as Array<[string, string]>);

    const destinationUrl = campaign.internalDestination
        || (targetProfessional ? `/${targetProfessional.username}` : '/search');

    const authUrl = `/onboarding?redirect=${encodeURIComponent(destinationUrl)}`;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
            <CampaignVisitTracker slug={campaign.slug} clickId={clickId} site={site} zone={zone} creative={creative} variation={variation} utm={utm} />
            {/* Top Navigation Header */}
            <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Image
                        src="/Logo.svg"
                        alt="MimoChat"
                        width={130}
                        height={36}
                        priority
                        className="h-8 w-auto object-contain"
                    />
                </div>
                <Link
                    href={authUrl}
                    data-campaign-cta
                    className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                >
                    Entrar
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </header>

            {/* Main Hero / Conversion Content */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
                <div className="max-w-xl w-full bg-white border border-purple-100 rounded-3xl p-6 sm:p-8 shadow-[0_10px_40px_rgba(124,58,237,0.06)] flex flex-col gap-6">
                    {/* Badge */}
                    <div className="flex items-center gap-2 self-start bg-purple-50 border border-purple-100 px-3 py-1 rounded-full text-purple-700 text-xs font-extrabold uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                        <span>Conversas Exclusivas</span>
                    </div>

                    {/* Headline & Body */}
                    <div className="flex flex-col gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight">
                            {campaign.landingHeadline}
                        </h1>
                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                            {campaign.landingBody}
                        </p>
                    </div>

                    {/* Creator Card if linked */}
                    {targetProfessional && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-purple-200 shadow-sm bg-slate-200">
                                {targetProfessional.photoUrl ? (
                                    <Image
                                        src={targetProfessional.photoUrl}
                                        alt={targetProfessional.name || targetProfessional.username}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-purple-600 font-black text-xl">
                                        {(targetProfessional.name || targetProfessional.username || 'M')[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-slate-900 truncate text-base">
                                        {targetProfessional.name || targetProfessional.username}
                                    </h3>
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                                </div>
                                <p className="text-xs text-purple-600 font-semibold">
                                    @{targetProfessional.username}
                                </p>
                                {targetProfessional.bio && (
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                        {targetProfessional.bio}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Custom Landing Image if provided */}
                    {campaign.landingImageUrl && !targetProfessional && (
                        <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-slate-200">
                            <Image
                                src={campaign.landingImageUrl}
                                alt={campaign.landingHeadline}
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}

                    {/* CTA Button */}
                    <div className="flex flex-col gap-3 pt-2">
                        <Link
                            href={authUrl}
                            data-campaign-cta
                            className="w-full h-13 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-base uppercase tracking-wide transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <span>Conversar Agora</span>
                            <ArrowRight className="w-5 h-5" />
                        </Link>

                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Cadastro rápido e seguro no MimoChat</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-400">
                <p>© {new Date().getFullYear()} MimoChat — Todos os direitos reservados.</p>
            </footer>
        </div>
    );
}
