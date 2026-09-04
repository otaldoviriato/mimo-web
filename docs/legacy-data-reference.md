# Referência de dados legados do Mimo

**Status:** documentação para a migração marketplace-first

**Documento principal:** [marketplace-first-refactor-plan.md](./marketplace-first-refactor-plan.md)

## 1. Finalidade

Este arquivo documenta campos, documentos e metadados produzidos pelo modelo em que a profissional trazia a própria audiência e recebia imediatamente por mensagem.

Depois do corte marketplace-first:

- os valores antigos permanecem no MongoDB para auditoria, conciliação e explicação do histórico;
- o código ativo não deve usar esses valores para preço, cadastro, ranking, remuneração ou aquisição;
- campos legados podem ser removidos dos schemas Mongoose ativos sem serem apagados dos documentos já armazenados;
- nenhuma migração deve zerar, renomear destrutivamente ou recalcular o passado;
- consultas históricas, quando necessárias, devem passar por um adaptador explicitamente chamado `legacy`, somente leitura;
- a ausência de `billingEngineVersion` em mensagem ou lançamento antigo equivale a `legacy_v1`;
- documentos pós-corte usam uma versão explícita, inicialmente `marketplace_v2`.

## 2. Classificações

| Classificação | Significado |
|---|---|
| `HISTÓRICO` | valor preservado, sem novas escritas e sem influência no produto |
| `SUBSTITUÍDO` | significado continua existindo em um campo/entidade nova |
| `ATIVO ESCOPADO` | continua válido, mas deixa de ser regra genérica |
| `A CONFIRMAR` | exige auditoria dos dados antes de decidir mapeamento |

## 3. Regras para manutenção

1. Não reutilizar um campo legado para um significado diferente.
2. Não misturar eventos antigos e novos sob o mesmo enum sem versão.
3. Não apresentar sessões reconstruídas como `QualifiedConversation`.
4. Não calcular saldo atual somando novamente lançamentos que já alteraram `User.balance`.
5. Não apagar registros financeiros; correções usam lançamento compensatório.
6. Não apagar mensagens vinculadas a cobrança ou moderação por uma ação administrativa comum.
7. Todo relatório que misture períodos deve separar “antes do corte” e “marketplace”.
8. Toda rotina de migração deve ter dry-run, chave de execução e relatório de reconciliação.

---

## 4. Coleção `users`

Modelo atual: `models/User.ts` nos dois repositórios.

| Campo | Significado histórico | Depois do corte | Substituto/observação |
|---|---|---|---|
| `balance` | saldo único em centavos; para cliente representa créditos e para profissional ganhos já disponíveis | `SUBSTITUÍDO` | mapear para carteira de cliente ou profissional no instante do corte; manter o valor antigo congelado |
| `promotionalBalance` | parcela promocional do saldo do cliente | `SUBSTITUÍDO` | `customerPromoAvailableCents` e ledger de funding |
| `chargePerCharSubscribers` | preço individual por caractere para assinante | `HISTÓRICO` | preço global derivado do desconto |
| `chargePerCharNonSubscribers` | preço individual por caractere para não assinante | `HISTÓRICO` | preço global |
| `subscriberDiscountPercentage` | desconto individual escolhido pela profissional | `HISTÓRICO` | desconto global em AppSettings |
| `acquiredByProfessionalId` | profissional cujo link foi atribuído ao cadastro | `HISTÓRICO` | atribuição de campanha em entidade própria |
| `acquiredByProfessionalUsername` | username da profissional de aquisição | `HISTÓRICO` | apenas contexto de referral antigo |
| `acquisitionSource` | `profile_share` ou `first_paid_message` | `HISTÓRICO` | origem marketplace versionada |
| `acquiredAt` | timestamp da atribuição antiga | `HISTÓRICO` | não sobrescrever |
| `engagementEmailsSent` | etapas de e-mail para incentivar compartilhamento | `HISTÓRICO` | campanha de engajamento removida |
| `isHighSpender` | classificação ampla de cliente para telas/alertas | `A CONFIRMAR` | pode continuar somente como sinal interno; não é pilar do marketplace |
| `financialLastViewedAt` | visualização de alertas financeiros | `ATIVO ESCOPADO` | manter apenas se ainda servir à nova carteira |
| `activationLastViewedAt` | visualização do funil antigo de ativação | `HISTÓRICO` | remover UI de ativação por compartilhamento |
| `subscribers` | cache de clerkIds assinantes | `SUBSTITUÍDO` como autoridade | coleção `subscriptions` é a fonte; cache só pode existir derivado |
| `isProfessional` | papel da conta | `ATIVO ESCOPADO` | escrita somente pelo workflow administrativo |
| `professionalStatus` | situação da profissional | `ATIVO ESCOPADO` | separar candidatura, publicação e identidade quando necessário |
| `identityStatus` | status de verificação | `ATIVO ESCOPADO` | sinal de confiança e requisito de campanha |
| `hideFromExplore` | ocultação voluntária/administrativa | `ATIVO ESCOPADO` | não transformar em `trafficEligible`; manter como ocultação explícita |
| `isSuspended`, `suspendedAt` | desativação de acesso | `ATIVO ESCOPADO` | acrescentar motivo, autoria e histórico de sanção |
| `avgResponseTimeMinutes` | média de tempo de resposta | `SUBSTITUÍDO` ou recalculado | usar métrica robusta e janela documentada |
| `accessCount`, `lastAccessAt`, `lastSeen`, `isOnline` | atividade/presença | `ATIVO ESCOPADO` | usados em confiança, com semântica consistente |
| `subscriptionPrice`, `isSubscriptionEnabled` | produto de assinatura da profissional | `ATIVO ESCOPADO` | não confundir com preço global do chat |
| `onboardingStep` | progresso comum a cliente/profissional | `SUBSTITUÍDO` | jornadas separadas por papel provisionado |

### 4.1 Migração de saldo

Antes de mapear:

- confirmar que `balance` está em centavos em todos os documentos;
- reconciliar saques pendentes e rejeitados;
- investigar profissional com `promotionalBalance > 0`;
- investigar cliente com lançamentos de crédito profissional;
- impedir escrita durante o snapshot;
- comparar soma de saldos com ledger/microtransações;
- gerar exceções, não corrigir silenciosamente.

O campo antigo não deve continuar espelhado depois do corte, pois dois saldos graváveis criariam fontes de verdade concorrentes.

---

## 5. Coleção `appsettings`

Documento global atual: `key = "global"`.

| Campo | Significado histórico | Depois do corte | Substituto/observação |
|---|---|---|---|
| `platformFeePercentage` | taxa genérica aplicada no momento de mensagem/mídia/presente/assinatura | `HISTÓRICO` para conversa; `ATIVO ESCOPADO` nos demais produtos | criar configurações nomeadas por produto |
| `maxPricePerChar` | limite para preço individual da profissional | `HISTÓRICO` | removido |
| `defaultPricePerCharSubscribers` | default copiado/usado para preço de assinante | `SUBSTITUÍDO` | preço derivado, não uma segunda configuração |
| `defaultPricePerCharNonSubscribers` | default/global atual | `SUBSTITUÍDO` | `customerPricePerEquivalentChar` global |
| `subscriberDiscountPercentage` | desconto global parcial já existente | `SUBSTITUÍDO`/mantido com nome claro | única fonte do desconto; inicial 20% |
| `audioPriceMultiplier` | multiplicador atual de áudio | `SUBSTITUÍDO`/mantido com nome claro | `audioEquivalentCharsPerSecond = 5` |
| `chatSessionTimeoutMinutes` | intervalo usado para notificação/e-mail de “nova sessão” | `HISTÓRICO` | não reutilizar para tentativa |
| `earningsSessionInactivityMinutes` | janela de agrupamento visual do extrato | `HISTÓRICO` | conversa real fecha em 3h fixas V1 |
| `earningsSessionMinimumCents` | mínimo para exibir bloco de ganho | `HISTÓRICO` | não existe mínimo financeiro |
| `creatorEngagementEmailsEnabled` | liga e-mails de compartilhamento | `HISTÓRICO` | remover cron e UI |
| `creatorEngagementStep1Enabled` | liga primeira etapa | `HISTÓRICO` | remover |
| `creatorEngagementStep1Hours` | espera da primeira etapa | `HISTÓRICO` | remover |
| `creatorEngagementStep2Enabled` | liga segunda etapa | `HISTÓRICO` | remover |
| `creatorEngagementStep2Hours` | espera da segunda etapa | `HISTÓRICO` | remover |
| `exploreSortingCriteria` | critérios configuráveis antigos | `SUBSTITUÍDO` | ranking marketplace por contrato próprio |
| `comparisonPeriod` | comparação genérica da dashboard antiga | `A CONFIRMAR` | manter apenas se uma tela nova usar |
| `newProfileDaysThreshold` | classificação de perfis novos | `A CONFIRMAR` | pode apoiar Explore, mas não referral |
| `newClientHoursThreshold` | classificação de cliente novo | `A CONFIRMAR` | pode apoiar operação |
| `activeRechargedClientDaysThreshold` | card/segmentação antiga | `A CONFIRMAR` | manter só se houver uso operacional claro |
| `activeUnrechargedClientHoursThreshold` | card/segmentação antiga | `A CONFIRMAR` | manter só se houver uso operacional claro |
| `activeUserThresholdDays` | atividade genérica | `A CONFIRMAR` | substituir por definições explícitas |
| `clientLevels` | níveis por gasto | `A CONFIRMAR` | não usar como ranking central |
| `autoModeration` | boolean genérico sem workflow completo | `SUBSTITUÍDO` | configuração de fila/padrões versionada |
| `professionalsOnlyCreateRooms` | regra de criação de sala | `A CONFIRMAR` | alinhar ao fluxo marketplace; nome é ambíguo |

### 5.1 Novas fontes de verdade

O novo documento/configuração deve evitar dois preços armazenados:

- `customerPricePerEquivalentCharCents = 5`;
- `subscriberDiscountBps = 2000`;
- preço assinante é derivado = 4 centavos;
- `audioEquivalentCharsPerSecond = 5`;
- bônus têm somente `enabled` e `percentagePoints`;
- participação base, limiares, prazos e teto permanecem no código V1.

Snapshots gravados em tentativa/conversa impedem que uma alteração posterior mude dinheiro em andamento.

---

## 6. Coleção `messages`

Modelos atuais: `mimo-web/models/Message.ts` e `mimo-chat-server/src/models/Message.ts`.

| Campo | Significado histórico | Depois do corte | Observação |
|---|---|---|---|
| `charCount` | normalmente `content.length` | `HISTÓRICO` nos antigos | novo campo usa graphemes/equivalentes oficiais |
| `cost` | custo da mensagem em centavos | `HISTÓRICO` nos antigos | novo custo permanece registrado, mas com versão e snapshot |
| `platformFee` | taxa calculada por mensagem | `HISTÓRICO` | não preencher como taxa de conversa pós-corte |
| `receiverEarnings` | ganho imediato do destinatário | `HISTÓRICO` | pós-corte o repasse pertence à conversa |
| `isAudio`, `audioDuration`, `audioUrl` | áudio; schemas estão divergentes | `ATIVO ESCOPADO` | duração validada; áudio de cliente vira equivalentes |
| `isLockedImage`, `lockedImagePrice` | mídia paga separada | `ATIVO ESCOPADO` | fora da base de conversa |
| `isGift` | presente | `ATIVO ESCOPADO` | fora da base |
| `isSystem` | evento de sistema | `ATIVO ESCOPADO` | não conta nem renova tentativa |
| `deletedFor` | ocultação por usuário | `ATIVO ESCOPADO` | não muda contagem/financeiro |
| `isTemporary`, `expiresAt`, `isExpired` | mídia/mensagem temporária | `ATIVO ESCOPADO` | expiração visual não apaga evidência financeira necessária |

Campos novos recomendados:

- `billingEngineVersion`;
- `idempotencyKey`;
- `pricingSnapshot`;
- `textGraphemeCount`;
- `audioBillableSeconds`;
- `equivalentCharCount`;
- `cashFundedCents`;
- `promoFundedCents`;
- `qualificationAttemptId`;
- `qualifiedConversationId`.

Não fazer backfill de contagem nova em mensagens antigas. A string original pode já ter sofrido ocultação, diferenças de normalização ou regras de preço que não existem mais.

---

## 7. Coleção `microtransactions`

| Campo/valor | Significado histórico | Depois do corte |
|---|---|---|
| `type = credit`, `source = message` | crédito imediato para a profissional | `HISTÓRICO` |
| `type = debit`, `source = message` | débito do cliente | `HISTÓRICO`; novos débitos vão ao ledger versionado |
| `type = platform_fee` | taxa por evento | `HISTÓRICO` |
| `source = image_unlock` | repasse de mídia | `ATIVO ESCOPADO` ou migrado ao novo ledger |
| `source = gift` | repasse de presente | `ATIVO ESCOPADO` ou migrado ao novo ledger |
| `source = subscription` | repasse de assinatura | `ATIVO ESCOPADO` ou migrado ao novo ledger |
| `source = campaign` | grant/uso promocional | `ATIVO ESCOPADO` |
| `messageId` | vínculo eventual com mensagem | `HISTÓRICO`; nem todo legado possui |
| `withdrawable` | se crédito promocional pode ser sacado | `A CONFIRMAR` por tipo |
| `metadata.platformFee` | taxa calculada no evento | `HISTÓRICO` |

Motivo para não ampliar essa coleção sem versão: `credit/message` hoje quer dizer “dinheiro já entrou no saldo”; no modelo novo, a mensagem gera receita e apenas uma conversa liquidada gera ganho disponível.

---

## 8. Coleção `transactions`

Essa coleção mistura recarga, saque, créditos, débitos e taxas e apresenta risco de unidade.

| Campo | Risco/uso histórico | Depois do corte |
|---|---|---|
| `amount` | há caminhos que tratam como reais e outros como centavos | `A CONFIRMAR` documento a documento |
| `status` | mistura estados de pagamento e `debit` | `HISTÓRICO`; novos domínios têm estados próprios |
| `type` | mistura método de pagamento e natureza contábil | `HISTÓRICO`/migração gradual |
| `source` | produto/origem | preservar; novos lançamentos usam enum versionado |
| `abacatePayId` | id externo de recarga | preservar |
| `messageId`, `relatedUserId` | vínculos financeiros | preservar |
| `withdrawable` | regra de disponibilidade | preservar e reconciliar |

Antes do corte, gerar relatório por combinação `type + source + status` e validar a unidade real com amostras e saldo.

---

## 9. Coleção `acquisitionevents`

Tipos atuais:

- `link_viewed`;
- `link_shared`;
- `signup_attributed`;
- `first_recharge`;
- `first_paid_message`;
- `explore_profile_impression`;
- `explore_profile_viewed`;
- `professional_consumed`;
- `gmv_recorded`.

Origens atuais:

- `profile_share`;
- `explore`;
- `first_paid_message`;
- `direct`;
- `unknown`.

Tratamento:

| Grupo | Depois do corte |
|---|---|
| link/referral | histórico, sem novas emissões |
| impressão/visita do Explore | pode continuar, com versão |
| recarga/mensagem/GMV antigos | histórico |
| eventos marketplace | novos nomes e payload versionado |

Não chamar `signup_attributed/profile_share` de campanha. Não usar `professionalId` antigo como se fosse profissional anunciada. A entidade de campanha deve ter referência própria.

---

## 10. Coleção `customerrelationships`

| Campo | Significado histórico | Depois do corte |
|---|---|---|
| `relationshipKey` | par cliente/profissional | pode continuar como chave de relacionamento |
| `origin` | origem antiga do primeiro evento pago | histórico para relações antigas |
| `acquisitionProfessionalId` | profissional que trouxe o cliente | histórico |
| `firstPaidSource` | primeira monetização, inclusive presente/assinatura | preservar |
| `professionalPosition` | primeira ou segunda profissional consumida | histórico/analytics antigo |
| `gmvCents`, `paidEventsCount` | volume acumulado | pode continuar como projeção derivada, versionada |
| `d7RetainedAt`, `d30RetainedAt` | retenção da relação | pode continuar se a definição for documentada |

Não usar a origem da relação para alterar preço, taxa ou prioridade. A nova atribuição de campanha é independente.

---

## 11. Coleção `professionalactivations`

Essa coleção mistura relacionamento operacional útil com ativação para compartilhamento.

| Campo | Depois do corte |
|---|---|
| `professionalId` | pode ser reaproveitado em CRM de recrutamento se a coleção for formalmente migrada/renomeada |
| `assignedTeamMemberId`, `assignedTeamMemberName` | potencialmente úteis |
| `status`, `stage`, `notes`, `nextSteps`, `history` | úteis somente se semântica virar recrutamento/onboarding |
| `shareClickCount` | histórico |
| `firstShareClickedAt` | histórico |
| `lastShareClickedAt` | histórico |
| `activatedAt` | ambíguo; não reutilizar sem versão |

Recomendação: criar uma entidade clara de onboarding profissional ou migrar a coleção com `workflowVersion`. Campos de compartilhamento antigos permanecem fisicamente, mas não aparecem na UI nova.

---

## 12. Coleção `creatorapplications`

Campos de identidade de candidatura podem continuar válidos:

- nome;
- nome artístico;
- Instagram;
- WhatsApp;
- e-mail;
- idade;
- cidade/estado;
- experiência;
- origem;
- motivo;
- consentimentos;
- status;
- notas.

Mudanças de semântica:

- “criadora” passa a “profissional” na linguagem interna e externa adotada;
- aprovação da candidatura não é o mesmo que conta publicada;
- candidatura não é `User`;
- exclusão comum vira arquivamento/retenção;
- consentimentos precisam registrar versão do texto aceito;
- contato e documento devem ter acesso restrito.

O endpoint público atualmente grava `CreatorApplication`, mas o endpoint individual do BackOffice consulta `User`. Essa inconsistência precisa ser eliminada antes do piloto.

---

## 13. Coleção `rooms`

| Campo | Tratamento |
|---|---|
| `participants` | ativo; padronizar ordenação e índice único nos dois repos |
| `lastMessage`, `lastMessageTime` | ativo como projeção |
| `unreadCount` | ativo |
| `deletedBy` | ocultação, não exclusão |
| `monetizationDisabled` | legado/risco; restringir a equipe/suporte ou substituir por tipo de sala |

O schema do servidor possui `monetizationDisabled`, mas o schema web não. Nenhum serviço deve poder apagar a sala para “moderar”. Criar `archivedAt`, `archivedBy`, `archiveReason` e preservar mensagens.

---

## 14. Coleções financeiras e operacionais que permanecem

Estas não são legadas por inteiro, embora precisem de revisão:

| Coleção | Uso |
|---|---|
| `subscriptions` | autoridade de assinatura ativa e desconto |
| `withdrawrequests` | saque; deve consumir somente disponível e reservar atomicamente |
| `creditcampaigns` | configuração de crédito promocional |
| `creditgrants` | concessão idempotente |
| `creditusages` | consumo promocional |
| `galleryitems` | perfil e mídia |
| `auditlogs` | acesso e decisões administrativas |
| `help/tickets` | suporte |
| `giftcodes` | cupons/presentes conforme produto |

Preservar não significa manter os mesmos acessos. Todas devem usar unidades e ids coerentes com o ledger novo.

---

## 15. Metadados fora do MongoDB

### 15.1 Clerk

Metadados legados:

- `role`;
- `profileSelectedAt`;
- `profileRoleSource`;
- payload de referral;
- origem `creator_landing`.

Tratamento:

- não confiar em `unsafeMetadata` para conceder papel profissional;
- cadastro comum ignora pedido client-side de profissional;
- papel profissional vem de ação server-side/autorizada;
- limpar metadados antigos somente se isso não apagar evidência necessária; registrar a migração.

### 15.2 Navegador

Chaves de referral e onboarding em `localStorage`/`sessionStorage`:

- podem permanecer em navegadores antigos;
- o código novo deve ignorá-las;
- a landing nova usa identificador de campanha próprio;
- não é necessário tentar apagar globalmente algo que o servidor já deixou de confiar.

### 15.3 ExoClick

Click IDs e macros novos não devem ser gravados em campos de referral antigos. O identificador externo deve ser tratado como dado de atribuição, com retenção, acesso e política próprios.

---

## 16. Código histórico permitido

Depois da limpeza, é aceitável manter:

- um adaptador somente leitura para extrato pré-corte;
- tipos `LegacyMessageFinancials` e `LegacyMicroTransaction`;
- consulta administrativa de auditoria por período;
- este dicionário;
- testes que provem que o código ativo não usa campos legados.

Não é aceitável manter:

- fallback que volta a pagar por mensagem;
- flag que reativa o onboarding de profissional;
- segundo cálculo de preço;
- dashboard antigo escondido;
- cron antigo desligado “por segurança”;
- rota antiga acessível;
- escrita dupla em saldo antigo e novo;
- cópia de toda a lógica antiga dentro de um módulo “legacy”.

O adaptador histórico deve explicar dados, não executar regras de negócio.

---

## 17. Auditoria de corte

O relatório de corte deve conter, sem expor dados pessoais:

- data/hora e `marketplaceCutoverAt`;
- versão dos dois serviços;
- contagem por coleção;
- soma de `User.balance` por papel;
- soma de `promotionalBalance`;
- saques por status;
- transações por tipo/origem/status/unidade confirmada;
- microtransações por tipo/origem;
- quantidade de salas e mensagens;
- quantidade de profissionais por status e identidade;
- quantidade de assinaturas ativas;
- quantidade de registros com anomalia;
- resultado da migração das carteiras;
- reconciliação antes/depois;
- ids da execução e do backup.

## 18. Testes para impedir regressão legada

Adicionar testes/checagens que falhem quando:

- `chargePerCharSubscribers` ou `chargePerCharNonSubscribers` forem lidos no envio;
- `subscriberDiscountPercentage` do usuário influenciar preço;
- `platformFeePercentage` influenciar conversa;
- mensagem pós-corte criar crédito profissional imediato;
- `receiverEarnings` pós-corte for usado como saldo;
- evento novo usar origem `profile_share`;
- signup comum criar profissional;
- uma rota self-service de migração existir;
- `earningsSessions` alimentar Explore ou carteira nova;
- `deleteMany` atingir mensagens/ledger em rota administrativa;
- saldo antigo for escrito depois do corte;
- documento marketplace for criado sem versão.
