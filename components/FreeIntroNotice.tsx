import type { FreeIntroState } from '@/hooks/useFreeIntro';

export function FreeIntroNotice({ state }: { state?: FreeIntroState }) {
    if (!state?.eligible && (!state?.grant || state.grant.convertedAt)) return null;

    const limit = state.limit || state.grant?.limit || 3;
    const used = state.grant?.used ?? 0;
    const remaining = typeof state.remaining === 'number' ? state.remaining : Math.max(0, limit - used);

    return (
        <div role="status" className="shrink-0 border-b border-purple-100 bg-purple-50 px-4 py-2 text-center text-xs leading-relaxed text-purple-800">
            {state.eligible
                ? `Conhecer grátis · As primeiras ${limit} ${limit === 1 ? 'resposta dela é gratuita' : 'respostas dela são gratuitas'}. Depois, você paga para ler. Somente texto nesta etapa.`
                : remaining > 0
                    ? `Conheça grátis · ${remaining} de ${limit} ${limit === 1 ? 'resposta gratuita restante' : 'respostas gratuitas restantes'}. Somente texto. Depois, as próximas mensagens exigem saldo para leitura.`
                    : 'Respostas gratuitas concluídas. As próximas mensagens dela exigem saldo para leitura.'}
        </div>
    );
}
