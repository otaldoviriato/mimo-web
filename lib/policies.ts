export interface PolicyClause {
    number?: string;
    title: string;
    paragraphs: string[];
}

export interface PolicyDefinition {
    id: string;
    version: string;
    effectiveDate: string;
    title: string;
    subtitle?: string;
    documentType: string;
    clauses: PolicyClause[];
    termsUrl: string;
    privacyUrl: string;
    buttonLabel: string;
}

export const POLICIES: Record<string, PolicyDefinition> = {
    'receipt-2026-09-05': {
        id: 'receipt-2026-09-05',
        version: 'receipt-2026-09-05',
        effectiveDate: '5 de setembro de 2026',
        documentType: 'Termo Aditivo de Condições Comerciais e Modelo de Mensagens',
        title: 'Atualização dos Termos de Uso e Política de Privacidade',
        subtitle: 'Leia as condições aplicáveis à transição do modelo de conversas e mensagens.',
        clauses: [
            {
                number: '1',
                title: 'Gratuidade de envio pelo usuário cliente',
                paragraphs: [
                    'O envio de mensagens de texto, mensagens de áudio, fotos e vídeos pelo usuário cliente para profissionais é integralmente gratuito, não havendo débito de saldo no momento do disparo da mensagem.'
                ]
            },
            {
                number: '2',
                title: 'Tarifação de mensagens no recebimento',
                paragraphs: [
                    'As mensagens de texto e áudio transmitidas por perfis profissionais serão tarifadas do saldo do cliente no momento exato do seu recebimento na plataforma, independentemente de a conversa ser aberta ou visualizada de imediato.'
                ]
            },
            {
                number: '3',
                title: 'Teto de caracteres cobrados por mensagem',
                paragraphs: [
                    'A tarifação é limitada ao teto inicial de até 50 caracteres equivalentes por mensagem, conforme parâmetros operacionais da plataforma. Caracteres que excedam esse limite são gratuitos e continuam sendo entregues integralmente ao destinatário.',
                    'Mensagens de áudio têm sua duração em segundos convertida em caracteres equivalentes com base no índice vigente informado no aplicativo, incidindo sobre elas o mesmo teto tarifável.'
                ]
            },
            {
                number: '4',
                title: 'Saldo insuficiente e mensagens em pendência',
                paragraphs: [
                    'Caso o cliente não disponha de saldo suficiente no momento da recepção de uma mensagem, esta será mantida em estado pendente, com seu conteúdo textual, de áudio ou citações protegido contra exibição até a regularização do saldo.',
                    'Após a realização de recarga pelo cliente, as mensagens pendentes serão processadas e liberadas de forma automática e cronológica (da mais antiga para a mais recente), respeitando o saldo disponível e garantindo a preservação do valor fixado no momento do envio original.'
                ]
            },
            {
                number: '5',
                title: 'Não retroatividade e preservação do histórico',
                paragraphs: [
                    'A cobrança no recebimento passa a vigorar exclusivamente a partir da confirmação deste termo. Nenhuma mensagem anterior ou histórico já existente no aplicativo será cobrado de forma retroativa.',
                    'Mídias pagas opcionais (fotos e vídeos privados) disponibilizadas pela profissional continuam sujeitas à prévia aquisição e desbloqueio voluntário pelo cliente.'
                ]
            }
        ],
        termsUrl: '/termos-de-uso',
        privacyUrl: '/politica-de-privacidade',
        buttonLabel: 'Concordo com os termos atualizados'
    }
};

export const CURRENT_POLICY_ID = 'receipt-2026-09-05';
export const CURRENT_POLICY = POLICIES[CURRENT_POLICY_ID];
