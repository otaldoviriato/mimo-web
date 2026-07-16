// Tipos compartilhados do painel administrativo do MimoChat

export interface SettingsData {
    platformFeePercentage: number;
    uploadLimitMB: number;
    autoModeration: boolean;
    professionalsOnlyCreateRooms: boolean;
    adminClerkIds: string[];
    comparisonPeriod: 'none' | 'week' | 'month';
    maxPricePerChar: number;
    maxSubscriptionPrice: number;
    minSubscriptionPrice: number;
    subscriberDiscountPercentage: number;
    minPublicPhotos: number;
    maxPublicPhotos: number;
    minExclusivePhotos: number;
    maxExclusivePhotos: number;
    pixEnabled: boolean;
    creditCardEnabled: boolean;
    couponsEnabled: boolean;
    chatSessionTimeoutMinutes: number;
    onlineDelayMinutes?: number;
    defaultPricePerCharSubscribers: number;
    defaultPricePerCharNonSubscribers: number;
    audioPriceMultiplier: number;
    pwaShowAgainIntervalDays: number;
    identityVerificationPromptIntervalDays: number;
    newProfileDaysThreshold: number;
    chatInactivityHours?: number;
    exploreSortingCriteria?: string[];
}

export interface ChatMessage {
    sender: string;
    text: string;
    time: string;
    cost: number;
    timestamp?: string;
}

export interface ChatRoom {
    id: string;
    userA: { name: string; email: string; clerkId: string };
    userB: { name: string; email: string; clerkId: string };
    messagesCount: number;
    lastMessage: string;
    time: string;
    totalRevenue: number;
    history: ChatMessage[];
}

export interface RichAdmin {
    clerkId: string;
    username: string;
    name: string;
    email: string;
    photoUrl: string | null;
}

export interface HelpTicketData {
    _id: string;
    senderEmail: string;
    senderName?: string;
    recipientEmail?: string;
    subject: string;
    message: string;
    status: 'novo' | 'em_atendimento' | 'lido' | 'resolvido' | 'arquivado';
    isFavorite: boolean;
    isRead: boolean;
    notes?: string;
    isOutbox?: boolean;
    replies?: HelpTicketData[];
    createdAt: string;
    updatedAt: string;
}

export interface WithdrawRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhotoUrl: string | null;
    amount: number;
    pixKey: string;
    status: 'pendente' | 'processando' | 'concluido' | 'rejeitado';
    hiddenFromUser?: boolean;
    hiddenFromUserAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
}
