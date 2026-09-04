# Dados legados após o corte marketplace v3

## Regra ativa

Desde `marketplace_v3`, toda mensagem enviada pelo cliente é cobrada imediatamente e o repasse da profissional é disponibilizado na mesma transação. Não existem qualificação, barra de progresso, prazo de três horas, bônus, saldo pendente ou fechamento financeiro de conversa.

Fontes de verdade:

- preço global: `AppSettings.conversationPricePerEquivalentCharCents` (padrão: 5 centavos);
- desconto global do assinante: `AppSettings.subscriberDiscountPercentage` (padrão: 20%);
- áudio: `AppSettings.audioEquivalentCharsPerSecond` (padrão: 5 equivalentes por segundo arredondado para cima);
- margem: `AppSettings.platformFeePercentage` (padrão: 20%);
- saldo do cliente: `customerCashAvailableCents + customerPromoAvailableCents`;
- saldo sacável da profissional: `professionalAvailableCents`;
- auditoria financeira nova: `financialledgerentries`, com `billingEngineVersion = marketplace_v3`;
- valor por mensagem: `Message.cost`, `Message.receiverEarnings` e `Message.platformFee`.

## Coleções preservadas, mas inativas

As coleções `qualificationattempts` e `qualifiedconversations` pertencem à implementação `marketplace_v2`. Seus documentos não devem ser apagados, reutilizados ou consultados pelo produto ativo. Permanecem apenas para auditoria e conciliação.

Campos legados preservados em `messages` e `financialledgerentries`:

- `qualificationAttemptId`;
- `qualifiedConversationId`;
- `attemptId`;
- `conversationId`;
- snapshots de bônus;
- lançamentos nas contas `professional_pending` e `platform_revenue` criados pelo v2.

Campos legados de preço individual em `users` (`chargePerCharSubscribers`, `chargePerCharNonSubscribers` e `subscriberDiscountPercentage`) não podem influenciar a cobrança. Os aliases antigos de preço em `appsettings` são mantidos temporariamente para leitura de histórico e compatibilidade do formulário administrativo; o endpoint administrativo os sincroniza com a configuração canônica.

Também são históricos e não orientam mais comportamento: `earningsSession*`, `quickReplyBonus*`, `engagementBonus*`, `deepConversationBonus*`, `exploreSortingCriteria` e `creatorEngagement*`. A automação de e-mails para a profissional trazer seguidores e a métrica de ativação por compartilhamento respondem `410 Gone`.

## Ranking do Explorar

O ranking ativo não usa completude, mensagens, receita, conversas qualificadas, performance ou descoberta aleatória. Depois dos filtros obrigatórios (`isProfessional`, aprovado, não suspenso e não oculto), a ordem é:

1. perfis realmente online;
2. último acesso mais recente;
3. `clerkId` como desempate estável.

Perfis antigos continuam disponíveis e aparecem no fim, acompanhados da informação de último acesso.

## Moderação

O regex de suspeita roda de forma assíncrona sobre mensagens recentes da sala. Um acerto cria ou atualiza `moderationreviews` com `roomId` e `messageIds`. A revisão nunca altera cobrança ou saldo; sanções são decisões administrativas separadas.

Documentos antigos de moderação podem conter apenas `conversationId`. Eles permanecem legíveis para auditoria.

## Cadastro de profissionais

Cadastro, migração ou escolha self-service de papel estão desativados. Todo novo cadastro comum nasce como cliente. A promoção para profissional só ocorre em rota administrativa, após seleção e verificação. Metadados antigos do Clerk (`role`, `profileRoleSource` e `creator_landing`) não concedem papel.

## Campanhas

Campanhas usam `campaigns` e `campaignvisits`, nunca campos antigos de referral. A landing `/c/[slug]` registra visita, clique no CTA e guarda a atribuição no navegador; o cadastro envia essa atribuição ao Clerk e o webhook associa o usuário à visita.

## Conciliação do v2

O script `mimo-chat-server/src/scripts/reconcileMarketplaceV2.ts` identifica tentativas ainda ativas e prepara um crédito compensatório de 80% do valor cobrado. Ele é dry-run por padrão, exige o database nominal e só escreve com os dois argumentos `--apply` e `--confirm-immediate-payout`.

Nenhuma execução de produção faz parte do commit. Antes de executar no database `mimo-chat`, revisar o dry-run, confirmar o valor total, assegurar backup e obter autorização explícita do responsável.

## Proibições de regressão

- não criar novas tentativas ou conversas qualificadas;
- não escrever em saldo pendente para mensagens;
- não emitir eventos de progresso/qualificação;
- não permitir preço individual por profissional;
- não confiar em `unsafeMetadata` para papel profissional;
- não apagar mensagens ou registros financeiros ao alterar papel ou encerrar conta;
- não alterar saldos como consequência de moderação;
- não reativar workers de fechamento/liquidação.
