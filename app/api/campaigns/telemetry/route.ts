import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { CampaignUserJourney } from '@/models/CampaignUserJourney';
import { Campaign } from '@/models/Campaign';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        const body = await request.json().catch(() => ({}));
        const effectiveUserId = userId || String(body.userId || '').trim();

        if (!effectiveUserId) {
            return NextResponse.json({ error: 'Identificador do usuário ausente' }, { status: 400 });
        }

        const eventType = String(body.eventType || '').trim();
        if (!eventType) {
            return NextResponse.json({ error: 'eventType é obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        // Busca a jornada do usuário mais recente vinculada a campanhas
        const journey = await CampaignUserJourney.findOne({ userId: effectiveUserId })
            .sort({ signupAt: -1 })
            .select('_id campaignId firstProfileViewed profilesVisited hasNavigatedPastFirstPhoto')
            .lean();

        if (!journey) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Usuário não possui jornada ativa de campanha vinculada',
            });
        }

        const now = new Date();
        const journeyId = journey._id;

        // Trata cada tipo de evento com updates pontuais no MongoDB ($set, $push, $inc)
        switch (eventType) {
            case 'explore_scroll': {
                const scrollDepth = Number(body.scrollDepth || 0);
                await CampaignUserJourney.updateOne(
                    { _id: journeyId },
                    {
                        $set: {
                            hasScrolledExplore: true,
                            isOnline: true,
                            lastActiveAt: now,
                            lastAction: scrollDepth > 0 ? `Navegou pelo Explorar (${scrollDepth}% da tela)` : 'Scrollou a tela de Explorar',
                        },
                        $inc: { exploreScrollCount: 1 },
                        $push: {
                            timeline: {
                                $each: [{
                                    type: 'explore_scroll',
                                    title: 'Scrollou a tela de Explorar',
                                    detail: scrollDepth > 0 ? `Rolagem até ${scrollDepth}% da página` : undefined,
                                    timestamp: now,
                                }],
                                $slice: -150 // mantém até os últimos 150 eventos
                            }
                        }
                    }
                );
                break;
            }

            case 'profile_view': {
                const professionalId = String(body.professionalId || '').trim();
                const username = String(body.username || '').trim();
                const name = body.name ? String(body.name).trim() : null;

                if (!professionalId && !username) break;

                const profIdentifier = username ? `@${username}` : professionalId;
                const isFirstProfile = !journey.firstProfileViewed;

                const updateOps: any = {
                    $set: {
                        isOnline: true,
                        lastActiveAt: now,
                        lastAction: `Visualizou o perfil de ${profIdentifier}`,
                    },
                    $push: {
                        timeline: {
                            $each: [{
                                type: 'profile_view',
                                title: isFirstProfile ? `Acessou 1º perfil: ${profIdentifier}` : `Visualizou perfil de ${profIdentifier}`,
                                detail: name ? `Nome exibido: ${name}` : undefined,
                                timestamp: now,
                                metadata: { professionalId, username, name }
                            }],
                            $slice: -150
                        }
                    }
                };

                if (isFirstProfile) {
                    updateOps.$set.firstProfileViewed = {
                        professionalId,
                        username: username || 'desconhecido',
                        name,
                        viewedAt: now,
                    };
                }

                // Verifica se o perfil já foi visitado anteriormente
                const existingVisited = journey.profilesVisited?.find(
                    (p: any) => p.professionalId === professionalId || (username && p.username === username)
                );

                if (existingVisited) {
                    await CampaignUserJourney.updateOne(
                        { _id: journeyId, 'profilesVisited.professionalId': professionalId },
                        {
                            ...updateOps,
                            $inc: { 'profilesVisited.$.count': 1 },
                            $set: {
                                ...updateOps.$set,
                                'profilesVisited.$.viewedAt': now,
                            }
                        }
                    );
                } else {
                    updateOps.$push.profilesVisited = {
                        professionalId,
                        username: username || 'desconhecido',
                        name,
                        viewedAt: now,
                        count: 1,
                    };
                    updateOps.$inc = { profilesVisitedCount: 1 };
                    await CampaignUserJourney.updateOne({ _id: journeyId }, updateOps);
                }
                break;
            }

            case 'photo_view': {
                const professionalId = String(body.professionalId || '').trim();
                const username = String(body.username || '').trim();
                const photoIndex = Number(body.photoIndex || 0);
                const totalPhotos = Number(body.totalPhotos || 1);
                const profIdentifier = username ? `@${username}` : 'profissional';

                const isPastFirst = photoIndex > 0;
                const actionDesc = isPastFirst
                    ? `Passou para a foto ${photoIndex + 1} de ${totalPhotos} de ${profIdentifier}`
                    : `Visualizou a 1ª foto de ${profIdentifier}`;

                await CampaignUserJourney.updateOne(
                    { _id: journeyId },
                    {
                        $set: {
                            isOnline: true,
                            lastActiveAt: now,
                            lastAction: actionDesc,
                            ...(isPastFirst ? { hasNavigatedPastFirstPhoto: true } : {}),
                        },
                        $push: {
                            photoGalleryActions: {
                                $each: [{
                                    professionalId,
                                    username,
                                    photoIndex,
                                    totalPhotos,
                                    action: isPastFirst ? 'next_photo' : 'opened',
                                    timestamp: now,
                                }],
                                $slice: -50
                            },
                            timeline: {
                                $each: [{
                                    type: 'photo_view',
                                    title: actionDesc,
                                    detail: isPastFirst ? `Avançou além da foto inicial (${photoIndex + 1}/${totalPhotos})` : 'Ficou apenas na foto de capa',
                                    timestamp: now,
                                }],
                                $slice: -150
                            }
                        }
                    }
                );
                break;
            }

            case 'message_click': {
                const professionalId = String(body.professionalId || '').trim();
                const username = String(body.username || '').trim();
                const profIdentifier = username ? `@${username}` : 'profissional';

                await CampaignUserJourney.updateOne(
                    { _id: journeyId },
                    {
                        $set: {
                            isOnline: true,
                            lastActiveAt: now,
                            lastAction: `Clicou em Enviar Mensagem para ${profIdentifier}`,
                        },
                        $push: {
                            messageButtonClicks: {
                                $each: [{
                                    professionalId,
                                    username,
                                    timestamp: now,
                                }],
                                $slice: -30
                            },
                            timeline: {
                                $each: [{
                                    type: 'message_click',
                                    title: `Clicou para iniciar conversa com ${profIdentifier}`,
                                    detail: 'Abriu a tela de chat para enviar mensagem',
                                    timestamp: now,
                                }],
                                $slice: -150
                            }
                        }
                    }
                );
                break;
            }

            case 'recharge_trigger': {
                const professionalId = String(body.professionalId || '').trim();
                const username = String(body.username || '').trim();
                const reason = String(body.reason || 'Saldo insuficiente para enviar mensagem').trim();
                const profIdentifier = username ? `@${username}` : '';

                await CampaignUserJourney.updateOne(
                    { _id: journeyId },
                    {
                        $set: {
                            isOnline: true,
                            lastActiveAt: now,
                            lastAction: profIdentifier
                                ? `Tentou enviar mensagem para ${profIdentifier} (abriu modal de recarga)`
                                : 'Tentou enviar mensagem sem créditos (abriu modal de recarga)',
                        },
                        $push: {
                            rechargeTriggers: {
                                $each: [{
                                    professionalId,
                                    username: username || null,
                                    reason,
                                    timestamp: now,
                                }],
                                $slice: -30
                            },
                            timeline: {
                                $each: [{
                                    type: 'recharge_modal',
                                    title: 'Gatilho de recarga acionado',
                                    detail: profIdentifier ? `Tentativa de mensagem para ${profIdentifier} sem saldo: modal de recarga aberto` : reason,
                                    timestamp: now,
                                }],
                                $slice: -150
                            }
                        }
                    }
                );
                break;
            }

            case 'heartbeat': {
                await CampaignUserJourney.updateOne(
                    { _id: journeyId },
                    {
                        $set: {
                            isOnline: true,
                            lastActiveAt: now,
                        }
                    }
                );
                break;
            }

            case 'page_leave': {
                await CampaignUserJourney.updateOne(
                    { _id: journeyId },
                    {
                        $set: {
                            isOnline: false,
                            lastActiveAt: now,
                        }
                    }
                );
                break;
            }

            default: {
                if (body.actionText) {
                    await CampaignUserJourney.updateOne(
                        { _id: journeyId },
                        {
                            $set: {
                                isOnline: true,
                                lastActiveAt: now,
                                lastAction: String(body.actionText),
                            },
                            $push: {
                                timeline: {
                                    $each: [{
                                        type: 'custom',
                                        title: String(body.actionText),
                                        timestamp: now,
                                    }],
                                    $slice: -150
                                }
                            }
                        }
                    );
                }
                break;
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro na rota de telemetria de campanha:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
