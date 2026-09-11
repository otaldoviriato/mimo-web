import type { FreeIntroState } from '@/hooks/useFreeIntro';

export function FreeIntroNotice({ state }: { state?: FreeIntroState }) {
    if (!state?.eligible && (!state?.grant || state.grant.convertedAt)) return null;
    return <div role="status" className="shrink-0 border-b border-purple-100 bg-purple-50 px-4 py-2 text-center text-xs leading-relaxed text-purple-800">
        {state.eligible
            ? `Conhecer grátis · As primeiras ${state.limit} respostas dela são gratuitas. Depois, você paga para ler. Somente texto nesta etapa.`
            : (state.remaining ?? 0) > 0
                ? `Conheça grátis · ${state.remaining} de ${state.grant?.limit} respostas gratuitas restantes. Somente texto. Depois, as próximas mensagens exigem saldo para leitura.`
                : 'Respostas gratuitas concluídas. As próximas mensagens dela exigem saldo para leitura.'}
    </div>;
}
