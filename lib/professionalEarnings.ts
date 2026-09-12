import { MicroTransaction } from '@/models/MicroTransaction';
import { Transaction } from '@/models/Transaction';

/**
 * ==============================================================================================
 * GUIA DEFINITIVO DE FATURAMENTO DAS PROFISSIONAIS (MIMOCHAT)
 * ATENÇÃO: LEITURA OBRIGATÓRIA PARA DESENVOLVEDORES E AGENTES DE INTELIGÊNCIA ARTIFICIAL
 * ==============================================================================================
 *
 * Este módulo é a FONTE ÚNICA DE VERDADE para o cálculo de receita/faturamento acumulado
 * de profissionais na plataforma MimoChat.
 *
 * REGRAS CRÍTICAS SOBRE UNIDADES DE MEDIDA E BANCO DE DADOS:
 *
 * 1. COLEÇÃO `MicroTransaction`:
 *    - Representa os créditos operacionais da profissional (mensagens recebidas legadas,
 *      fotos desbloqueadas, presentes/gifts, bônus de campanhas).
 *    - Filtro de ganhos: `{ userId: { $in: clerkIds }, type: 'credit' }`
 *    - Unidade do campo `amount`: SEMPRE EM CENTAVOS (número inteiro).
 *      Exemplo: R$ 10,00 está armazenado no banco como `1000`.
 *    - ALERTA: NUNCA multiplique por 100! O valor já é em centavos!
 *
 * 2. COLEÇÃO `Transaction`:
 *    - Representa transações financeiras gerais.
 *    - Assinaturas recebidas por profissionais:
 *      Filtro: `{ userId: { $in: clerkIds }, type: 'credit', source: 'subscription', status: 'COMPLETED' }`
 *      Unidade do campo `amount`: JÁ ESTÁ SALVO EM CENTAVOS!
 *      Exemplo: R$ 20,72 está armazenado no banco como `2072`.
 *    - ALERTA CRÍTICO: NUNCA multiplique por 100!
 *      No passado, alguém supôs erroneamente que `Transaction.amount` estaria em reais porque
 *      recargas de clientes (`source: 'recharge'`) possuíam histórico em reais em versões legadas.
 *      Porém, as assinaturas e créditos de profissionais são SEMPRE gravados em centavos inteiros!
 *
 * 3. COLEÇÃO `User`:
 *    - `User.professionalAvailableCents`:
 *      Este campo armazena o SALDO SACÁVEL ATUAL da profissional na carteira.
 *      Quando a profissional solicita um saque via PIX, este saldo É ZERADO/DEBITADO.
 *      Portanto, `professionalAvailableCents` NUNCA deve ser usado como métrica de faturamento
 *      acumulado histórico, nem em `Math.max()`.
 *    - `User.balance`:
 *      Campo legado de saldo de usuário/cliente. Também não representa faturamento histórico.
 *
 * 4. REPRESENTAÇÃO NO FRONTEND:
 *    - As funções deste módulo retornam valores SEMPRE EM CENTAVOS (ex: 2072).
 *    - Para exibir ao usuário em Reais na interface:
 *      `(totalEarningsCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
 * ==============================================================================================
 */

export interface ProfessionalEarningsResult {
    /** Faturamento total acumulado em centavos (MicroTransaction + Assinaturas) */
    totalEarningsCents: number;
    /** Ganhos com microtransações (presentes, fotos, mensagens) em centavos */
    microCreditsCents: number;
    /** Ganhos com assinaturas mensais pagas em centavos */
    subscriptionCreditsCents: number;
}

/**
 * Calcula o faturamento acumulado em centavos para uma lista de profissionais (clerkIds).
 * Retorna um Map onde a chave é o clerkId e o valor é o faturamento total em centavos.
 *
 * @param clerkIds Lista de IDs de usuário do Clerk das profissionais
 * @returns Map<string, number> (clerkId -> faturamento em centavos)
 */
export async function getProfessionalsEarningsMap(clerkIds: string[]): Promise<Map<string, number>> {
    const earningsMap = new Map<string, number>();
    if (!clerkIds || clerkIds.length === 0) return earningsMap;

    try {
        const [microAgg, subAgg] = await Promise.all([
            // 1. Microtransações: créditos recebidos por presentes, fotos, mensagens (já em centavos)
            MicroTransaction.aggregate([
                { $match: { userId: { $in: clerkIds }, type: 'credit' } },
                { $group: { _id: '$userId', total: { $sum: '$amount' } } }
            ]),
            // 2. Assinaturas: créditos de assinaturas concluídas (já em centavos)
            Transaction.aggregate([
                {
                    $match: {
                        userId: { $in: clerkIds },
                        type: 'credit',
                        source: 'subscription',
                        status: 'COMPLETED'
                    }
                },
                { $group: { _id: '$userId', total: { $sum: '$amount' } } }
            ])
        ]);

        for (const item of microAgg) {
            const userId = item._id;
            const amountCents = Math.round(Number(item.total || 0));
            earningsMap.set(userId, (earningsMap.get(userId) || 0) + amountCents);
        }

        for (const item of subAgg) {
            const userId = item._id;
            const amountCents = Math.round(Number(item.total || 0));
            earningsMap.set(userId, (earningsMap.get(userId) || 0) + amountCents);
        }
    } catch (error) {
        console.error('Erro ao calcular faturamento das profissionais em getProfessionalsEarningsMap:', error);
    }

    return earningsMap;
}

/**
 * Calcula os detalhes completos de faturamento de uma única profissional.
 *
 * @param clerkId ID Clerk da profissional
 * @returns ProfessionalEarningsResult em centavos
 */
export async function getSingleProfessionalEarnings(clerkId: string): Promise<ProfessionalEarningsResult> {
    if (!clerkId) {
        return { totalEarningsCents: 0, microCreditsCents: 0, subscriptionCreditsCents: 0 };
    }

    try {
        const [microAgg, subAgg] = await Promise.all([
            MicroTransaction.aggregate([
                { $match: { userId: clerkId, type: 'credit' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        userId: clerkId,
                        type: 'credit',
                        source: 'subscription',
                        status: 'COMPLETED'
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        const microCreditsCents = Math.round(Number(microAgg[0]?.total || 0));
        const subscriptionCreditsCents = Math.round(Number(subAgg[0]?.total || 0));

        return {
            totalEarningsCents: microCreditsCents + subscriptionCreditsCents,
            microCreditsCents,
            subscriptionCreditsCents
        };
    } catch (error) {
        console.error(`Erro ao obter faturamento para ${clerkId}:`, error);
        return { totalEarningsCents: 0, microCreditsCents: 0, subscriptionCreditsCents: 0 };
    }
}
