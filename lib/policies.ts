export interface PolicySection {
    title: string;
    description: string;
    tag?: string;
    iconType?: 'message' | 'receipt' | 'sliders' | 'lock' | 'shield';
}

export interface PolicyDefinition {
    id: string;
    version: string;
    badge: string;
    title: string;
    subtitle?: string;
    sections: PolicySection[];
    disclaimer?: string;
    termsUrl?: string;
    privacyUrl?: string;
    buttonLabel?: string;
}

export const POLICIES: Record<string, PolicyDefinition> = {
    'receipt-2026-09-05': {
        id: 'receipt-2026-09-05',
        version: 'receipt-2026-09-05',
        badge: 'Atualização no Mimo',
        title: 'O jeito de conversar no Mimo mudou',
        subtitle: 'Confira as melhorias no modelo de conversas e mensagens para você.',
        sections: [
            {
                title: 'Envio 100% gratuito',
                description: 'Agora, enviar mensagens de texto e áudios para as profissionais é gratuito para você.',
                tag: 'Grátis',
                iconType: 'message',
            },
            {
                title: 'Cobrança apenas no recebimento',
                description: 'Textos e áudios enviados pela profissional são debitados do seu saldo no momento do recebimento, mesmo que você esteja fora do app.',
                tag: 'Recebimento',
                iconType: 'receipt',
            },
            {
                title: 'Limite justo de caracteres',
                description: 'Textos têm teto de cobrança por mensagem (50 caracteres iniciais); o excedente é grátis. Áudios seguem a mesma regra com base na duração.',
                tag: 'Teto de valor',
                iconType: 'sliders',
            },
            {
                title: 'Mensagens protegidas sem saldo',
                description: 'Sem saldo, a mensagem fica pendente e o conteúdo permanece seguro. Ao recarregar, mensagens pendentes são liberadas automaticamente.',
                tag: 'Sem perda',
                iconType: 'lock',
            },
            {
                title: 'Fotos, vídeos e seu histórico',
                description: 'Enviar fotos e vídeos continua grátis para você. Mídias pagas mantêm os preços normais. Seu histórico anterior não sofre nenhuma cobrança retroativa.',
                tag: 'Seguro',
                iconType: 'shield',
            },
        ],
        disclaimer: 'Para continuar utilizando o MimoChat, é necessário concordar com o modelo atualizado, bem como nossos Termos de Uso e Política de Privacidade.',
        termsUrl: '/termos-de-uso',
        privacyUrl: '/politica-de-privacidade',
        buttonLabel: 'Li e concordo — continuar',
    },
};

export const CURRENT_POLICY_ID = 'receipt-2026-09-05';
export const CURRENT_POLICY = POLICIES[CURRENT_POLICY_ID];
