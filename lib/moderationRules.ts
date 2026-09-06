export type ModerationRuleName =
    | 'telegram_keyword'
    | 'pix_contact'
    | 'phone_sequence'
    | 'whatsapp_keyword'
    | 'instagram_keyword'
    | 'contact_phrase'
    | 'email'
    | 'url'
    | 'social_handle';

export interface ModerationRule {
    name: ModerationRuleName;
    label: string;
    description: string;
    pattern: RegExp;
}

export const MODERATION_RULES: ModerationRule[] = [
    {
        name: 'telegram_keyword',
        label: 'Telegram',
        description: 'Menção ao aplicativo Telegram ou @tg',
        pattern: /\b(?:telegram|telegr[aã]m|tg)\b/i,
    },
    {
        name: 'pix_contact',
        label: 'Chave Pix',
        description: 'Oferta, solicitação ou chave Pix externa',
        pattern: /\bpix\b.{0,40}\b(?:cpf|email|telefone|chave|aleatoria|celular|passa|manda|copia)\b|\b(?:chave\s+pix|manda\s+(?:o\s+)?pix|faz\s+(?:um\s+)?pix|meu\s+pix|pix\s*:)\b/i,
    },
    {
        name: 'phone_sequence',
        label: 'Número de Telefone',
        description: 'Sequência numérica de celular ou telefone fixo',
        pattern: /(?:\+?\s*55[\s().-]*)?(?:\(?\s*\d{2}\s*\)?[\s.-]*)?(?:9\s*)?\d{4}[\s.-]?\d{4}/,
    },
    {
        name: 'whatsapp_keyword',
        label: 'WhatsApp / Zap',
        description: 'Menção ao WhatsApp ou variações populares',
        pattern: /\b(?:whats(?:app)?|wpp|zap|zapzap)\b/i,
    },
    {
        name: 'instagram_keyword',
        label: 'Instagram',
        description: 'Menção ao Instagram ou Insta',
        pattern: /\b(?:instagram|insta|ig)\b/i,
    },
    {
        name: 'contact_phrase',
        label: 'Contato Externo',
        description: 'Expressão de convite para conversa fora do aplicativo',
        pattern: /\b(?:me chama|fala comigo|me adiciona|me segue|meu contato|fora do app|conversa fora|outro app)\b/i,
    },
    {
        name: 'email',
        label: 'E-mail',
        description: 'Endereço de e-mail compartilhado',
        pattern: /\b[a-z0-9._%+-]+\s*@\s*[a-z0-9.-]+\s*\.\s*[a-z]{2,}\b/i,
    },
    {
        name: 'social_handle',
        label: 'Arroba / Perfil',
        description: 'Identificador com @ de usuário externo',
        pattern: /(?:^|\s)@[a-z0-9._-]{3,}/i,
    },
    {
        name: 'url',
        label: 'Link / URL',
        description: 'Endereço ou domínio web',
        pattern: /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|me|io|app|br)\b)/i,
    },
];

export function normalizeForModeration(value: string): string {
    return (value || '')
        .normalize('NFKC')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[‐‑‒–—―]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

export function detectViolations(text: string): { rule: ModerationRuleName; label: string; excerpt: string }[] {
    const normalized = normalizeForModeration(text);
    if (!normalized) return [];

    const matches: { rule: ModerationRuleName; label: string; excerpt: string }[] = [];
    for (const rule of MODERATION_RULES) {
        if (rule.pattern.test(normalized)) {
            matches.push({
                rule: rule.name,
                label: rule.label,
                excerpt: text.replace(/\s+/g, ' ').trim().slice(0, 160),
            });
        }
    }
    return matches;
}
