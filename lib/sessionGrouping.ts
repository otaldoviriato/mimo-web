export interface SessionItem {
    id: string;
    type: 'message' | 'image_unlock' | 'gift' | 'other';
    amount: number; // valor em centavos
    timestamp: Date;
    description?: string;
    senderId?: string;
    receiverId?: string;
}

export interface ConversationSession {
    sessionId: string;
    roomId?: string;
    relatedUserId: string;
    clientName?: string;
    clientUsername?: string;
    clientPhotoUrl?: string | null;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    messagesCount: number;
    mediaCount: number;
    giftCount: number;
    totalEarnings: number; // total em centavos para a profissional
    totalRevenue?: number; // total em centavos gasto pelo cliente
    isTwoWaySession: boolean; // Indica se houve envio de mensagens de AMBOS os participantes no bloco
    items: SessionItem[];
}

export interface RawEventInput {
    id: string;
    relatedUserId: string;
    type: 'message' | 'image_unlock' | 'gift' | 'other';
    amount: number;
    timestamp: Date | string;
    description?: string;
    senderId?: string;
    receiverId?: string;
    roomId?: string;
}

/**
 * Agrupa eventos (mensagens ou transações) em sessões de conversa.
 * Uma nova sessão é iniciada se a diferença de tempo entre o evento atual e o anterior do mesmo relacionamento for maior que `timeoutMinutes`.
 */
export function groupEventsIntoSessions(
    events: RawEventInput[],
    timeoutMinutes: number = 30
): ConversationSession[] {
    if (!events || events.length === 0) return [];

    // Normalizar datas e ordenar por timestamp crescente
    const sorted = events
        .map(e => ({
            ...e,
            parsedDate: new Date(e.timestamp)
        }))
        .filter(e => !isNaN(e.parsedDate.getTime()))
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    // Agrupar eventos por participante/relacionamento (relatedUserId ou roomId)
    const groupedByRelation: Record<string, typeof sorted> = {};

    for (const event of sorted) {
        const key = event.roomId || event.relatedUserId;
        if (!groupedByRelation[key]) {
            groupedByRelation[key] = [];
        }
        groupedByRelation[key].push(event);
    }

    const allSessions: ConversationSession[] = [];

    // Processar cada relacionamento para identificar blocos de 30 min
    for (const key of Object.keys(groupedByRelation)) {
        const relationEvents = groupedByRelation[key];
        let currentSession: (ConversationSession & { sendersSet: Set<string> }) | null = null;

        for (const event of relationEvents) {
            const eventItem: SessionItem = {
                id: event.id,
                type: event.type,
                amount: event.amount,
                timestamp: event.parsedDate,
                description: event.description,
                senderId: event.senderId,
                receiverId: event.receiverId
            };

            const sender = event.senderId || (event.type === 'message' ? 'user_a' : 'user_b');

            if (!currentSession) {
                const sendersSet = new Set<string>();
                if (sender) sendersSet.add(sender);

                currentSession = {
                    sessionId: `${key}_${event.parsedDate.getTime()}`,
                    roomId: event.roomId,
                    relatedUserId: event.relatedUserId,
                    startTime: event.parsedDate,
                    endTime: event.parsedDate,
                    durationMinutes: 1,
                    messagesCount: event.type === 'message' ? 1 : 0,
                    mediaCount: event.type === 'image_unlock' ? 1 : 0,
                    giftCount: event.type === 'gift' ? 1 : 0,
                    totalEarnings: event.amount,
                    totalRevenue: event.amount,
                    isTwoWaySession: false,
                    sendersSet,
                    items: [eventItem]
                };
            } else {
                const diffMs = event.parsedDate.getTime() - currentSession.endTime.getTime();
                const diffMinutes = diffMs / (1000 * 60);

                if (diffMinutes <= timeoutMinutes) {
                    // Continua na mesma sessão de conversa
                    currentSession.endTime = event.parsedDate;
                    const totalDurationMs = currentSession.endTime.getTime() - currentSession.startTime.getTime();
                    currentSession.durationMinutes = Math.max(1, Math.round(totalDurationMs / (1000 * 60)));

                    if (event.type === 'message') currentSession.messagesCount += 1;
                    if (event.type === 'image_unlock') currentSession.mediaCount += 1;
                    if (event.type === 'gift') currentSession.giftCount += 1;

                    currentSession.totalEarnings += event.amount;
                    if (currentSession.totalRevenue !== undefined) {
                        currentSession.totalRevenue += event.amount;
                    }

                    if (sender) currentSession.sendersSet.add(sender);
                    currentSession.isTwoWaySession = currentSession.sendersSet.size >= 2;
                    currentSession.items.push(eventItem);
                } else {
                    // Inicia uma nova sessão de conversa
                    currentSession.isTwoWaySession = currentSession.sendersSet.size >= 2;
                    allSessions.push(currentSession);

                    const sendersSet = new Set<string>();
                    if (sender) sendersSet.add(sender);

                    currentSession = {
                        sessionId: `${key}_${event.parsedDate.getTime()}`,
                        roomId: event.roomId,
                        relatedUserId: event.relatedUserId,
                        startTime: event.parsedDate,
                        endTime: event.parsedDate,
                        durationMinutes: 1,
                        messagesCount: event.type === 'message' ? 1 : 0,
                        mediaCount: event.type === 'image_unlock' ? 1 : 0,
                        giftCount: event.type === 'gift' ? 1 : 0,
                        totalEarnings: event.amount,
                        totalRevenue: event.amount,
                        isTwoWaySession: false,
                        sendersSet,
                        items: [eventItem]
                    };
                }
            }
        }

        if (currentSession) {
            currentSession.isTwoWaySession = currentSession.sendersSet.size >= 2;
            allSessions.push(currentSession);
        }
    }

    // Ordenar todas as sessões das mais recentes para as mais antigas
    return allSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}
