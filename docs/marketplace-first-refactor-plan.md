# Mimo marketplace-first

## Especificação de produto e plano completo de migração

**Status:** histórico de planejamento. As regras de qualificação descritas neste documento foram canceladas em 4 de setembro de 2026 e não representam o produto ativo. Consulte [legacy-data-reference.md](./legacy-data-reference.md) para a regra `marketplace_v3` implementada.

**Data:** 3 de setembro de 2026

**Escopo técnico:** `mimo-web`, `mimo-chat-server` e banco MongoDB

**Documento complementar:** [legacy-data-reference.md](./legacy-data-reference.md)

Este documento consolida as decisões de produto tomadas até agora, registra o estado real encontrado no código e organiza a migração do Mimo para um marketplace de conversas. Criá-lo não altera comportamento, banco ou produção.

> **Decisão superveniente:** toda mensagem paga pelo cliente remunera a profissional imediatamente. Não existem meta de caracteres, barra de progresso, janela de três horas, conversa qualificada, bônus ou saldo pendente. O Explorar usa somente online e último acesso. As seções abaixo sobre qualificação e bônus são preservadas como memória decisória, não como especificação.

O objetivo não é adaptar parcialmente o modelo anterior. Ao final da migração, o produto ativo deve operar exclusivamente como marketplace-first. Dados antigos serão preservados para auditoria, mas não poderão continuar determinando cadastro, aquisição, ranking, preço, remuneração, dashboards ou comunicação.

---

## 1. Resumo executivo

O Mimo deixa de ser uma ferramenta para profissionais monetizarem a audiência que elas próprias trazem e passa a ser um marketplace em que:

1. o Mimo adquire clientes, principalmente por tráfego pago;
2. todos os cadastros comuns entram como clientes, sem escolha de papel;
3. profissionais entram por seleção, convite e aprovação controlada;
4. a vitrine interna apresenta profissionais reais, verificadas, completas e com sinais honestos de atividade;
5. o cliente paga um preço global e previsível por caractere equivalente enviado;
6. a profissional recebe imediatamente sua participação em cada mensagem paga pelo cliente;
7. a remuneração usa preço global e divisão objetiva, sem IA, bônus ou qualificação decidindo dinheiro;
8. qualidade, fraude e tentativa de tirar a conversa da plataforma são tratadas por moderação e sanções de conta, não por confisco de saldo;
9. campanhas, atribuição e conversão substituem compartilhamentos de links e “clientes trazidos” como centro da operação;
10. o BackOffice passa a mostrar conversas financeiramente ativas e o funil de tráfego pago.

### 1.1 Princípios não negociáveis

- **Um único posicionamento:** marketplace, não ferramenta e não híbrido.
- **Uma única regra comercial:** a origem do cliente não muda preço nem remuneração.
- **Cliente como jornada principal:** o cadastro comum nunca pergunta se a pessoa quer pagar ou receber.
- **Profissional como oferta curada:** facilidade operacional depois da aprovação, rigor antes dela.
- **Cobrança simples para o cliente:** enviou conteúdo cobrável, o valor é debitado; não há estorno por falta de resposta.
- **Remuneração por conversa:** tentativa não qualificada não gera crédito profissional.
- **Regra financeira objetiva:** IA não decide repasse.
- **Auditoria preservada:** registros históricos não são apagados nem reescritos para parecerem produzidos pelo novo modelo.
- **Sem compatibilidade eterna:** código legado será removido após o corte; apenas dados e visualização histórica estritamente necessária permanecem.

### 1.2 O que o produto não será

- Não haverá taxa diferente para clientes trazidos pela profissional.
- Não haverá preço por caractere definido individualmente por profissional.
- Não haverá perfil público duplicando o perfil interno do aplicativo.
- Não haverá bot fingindo ser a profissional para entregar resposta imediata.
- Não haverá “garantia de resposta” nem devolução automática de mensagens não respondidas.
- Não haverá IA classificando se a conversa merece ou não pagamento na primeira versão.
- Não haverá bloqueio de repasse por suspeita de moderação.
- Não haverá construtor genérico de bônus no BackOffice.
- Não haverá regra artificial de valor mínimo de R$ 10 para qualificar.

---

## 2. A nova experiência de produto

### 2.1 Papéis e cadastro

Existem três papéis operacionais:

| Papel | Entrada | Jornada |
|---|---|---|
| Cliente | cadastro normal | entra no aplicativo, explora perfis, recarrega e conversa |
| Profissional | inscrição/invite + análise + aprovação | completa identidade e perfil antes de receber destaque ou tráfego |
| Equipe/admin | provisionamento administrativo | suporte, curadoria, moderação e operação |

Regras:

- Todo `user.created` comum deve criar um cliente.
- O onboarding comum não mostra “quero conversar” versus “quero ganhar”.
- A mudança para profissional não pode estar disponível em Configurações.
- Metadados de navegador, landing page ou Clerk não podem promover uma conta automaticamente.
- Somente um fluxo autenticado e autorizado do BackOffice pode provisionar o papel profissional.
- Caso uma candidata já tenha conta de cliente, a conversão é administrativa e exige verificação financeira: sem tentativa aberta, sem assinatura conflitante e com destino explícito para créditos de cliente. Não é uma opção de autosserviço.
- Contas de equipe continuam separadas e nunca entram no ranking ou na cobrança comercial.

### 2.2 Aquisição e seleção de profissionais

Para o primeiro teste, a operação deve selecionar aproximadamente dez profissionais:

- atraentes para o público da campanha;
- maiores de 18 anos e com identidade aprovada;
- foto principal, capa, bio e galeria completas;
- nome e posicionamento coerentes com o criativo;
- notificações habilitadas e expectativa de resposta combinada;
- dados de recebimento válidos;
- aceite das novas regras de conversa, bônus e moderação.

O fluxo recomendado é:

`inscrição ou prospecção → análise → contato → convite → criação/vinculação da conta → verificação de identidade → perfil completo → aprovação → publicação`

A coleção `CreatorApplication` já oferece uma base para a candidatura externa, mas a gestão atual está dividida: o endpoint público grava `CreatorApplication`, enquanto parte do BackOffice trata registros de `User` como se fossem inscrições. Isso deve ser unificado. Aprovar uma inscrição não pode, por acidente, publicar um perfil incompleto.

Profissionais existentes não serão excluídas. Elas continuam acessíveis, mas:

- perfis incompletos ou inativos perdem posição naturalmente;
- os avisos “sem foto de capa”, “perfil não verificado” e “último acesso há X” são explícitos;
- perfis suspensos ou ocultados administrativamente não aparecem;
- não será criado um campo genérico como `trafficEligible`;
- a escolha de profissionais usadas em criativos/campanhas é manual na configuração da campanha.

### 2.3 Superfícies pública e privada

### Rota raiz

A rota `/` continua com comportamento de aplicativo:

- usuário autenticado entra em `/chats`;
- usuário anônimo segue para login/onboarding;
- não se transforma em uma landing page institucional genérica.

### Landing pages de campanha

Será criada uma única família de rotas públicas dinâmicas, por exemplo:

`/c/[slug]`

Ela é um criativo de campanha, não um “perfil público da profissional”. Pode usar uma profissional como protagonista, mas tem:

- mensagem e assets controlados pela campanha;
- idade mínima e avisos aplicáveis;
- sinais reais de confiança e disponibilidade;
- CTA único para entrar no Mimo;
- parâmetros e identificadores de atribuição;
- destino interno desejado depois da autenticação.

Fluxo:

`anúncio “fale com Júlia” → /c/julia-exoclick-a → login/cadastro → aplicativo → perfil interno da Júlia → chat`

Não haverá dois perfis canônicos. Depois do login, toda interação acontece na rota interna já existente do aplicativo.

O redirecionamento pós-login deve ser validado no servidor e limitado a destinos internos permitidos. A atribuição não deve depender apenas de `localStorage` ou `unsafeMetadata`.

### 2.4 Explore e perfil da profissional

O Explore deve privilegiar atração inicial sem esconder sinais de confiança.

### Filtros obrigatórios

- conta profissional;
- não suspensa;
- status compatível com publicação;
- não oculta do Explore;
- dados mínimos que tornem o card renderizável.

### Ranking por atributos reais

O ranking não usa uma flag subjetiva “boa para tráfego”. Ele combina, em ordem de importância a ser calibrada:

1. completude visual: foto, capa, bio e galeria;
2. verificação de identidade;
3. capacidade observada de gerar abertura de perfil e início pago de conversa;
4. atividade recente e presença;
5. sinais de confiança;
6. uma fração controlada de descoberta para perfis novos.

O algoritmo atual prioriza “conversas qualificadas” reconstruídas a partir de créditos antigos. Essa fonte deve ser substituída por registros reais de `QualifiedConversation`.

Desempenho de conversa pode ser um sinal secundário, mas não deve transformar a vitrine em uma lista exclusivamente de quem responde mais rápido. O desejo do cliente continua sendo o ponto de entrada.

### Sinais exibidos

- “Verificada”;
- “Online agora”, somente quando a presença for real;
- “Último acesso há X”;
- “Responde geralmente em X”, preferencialmente mediana recente, com amostra mínima;
- “Já trocou mais de X mensagens” ou faixas equivalentes;
- “Ativa no Mimo desde …”;
- alertas claros para capa ausente, perfil não verificado ou inatividade.

Métricas devem ser honestas, atualizadas e calculadas com regras documentadas. Não criar urgência falsa.

### 2.5 Cobrança do cliente

Existe um preço global. A profissional não escolhe seu próprio preço de mensagem.

| Situação | Preço por caractere equivalente |
|---|---:|
| Cliente não assinante daquela profissional | R$ 0,05 |
| Cliente assinante daquela profissional | R$ 0,04 |

O segundo valor é derivado do primeiro pelo desconto global de assinante, inicialmente **20%**, configurável no BackOffice. Não deve existir um desconto individual por profissional.

Regras:

- o débito acontece no envio bem-sucedido;
- apenas conteúdo entregue e persistido pode ser cobrado;
- mensagem não respondida continua cobrada;
- não há estorno por conversa curta, tentativa expirada ou resposta tardia;
- o cliente vê antes do envio como o preço é calculado;
- mensagens da profissional para o cliente não geram débito;
- suporte/equipe segue um fluxo explicitamente gratuito e separado;
- presentes, assinaturas e desbloqueios de mídia mantêm preços e lançamentos próprios.

O BackOffice terá uma única fonte de verdade:

- preço global do caractere equivalente;
- desconto global de assinante;
- preço derivado, apenas para visualização;
- equivalência de áudio.

### 2.6 O que conta como caractere

Texto é medido em **grapheme clusters visíveis**, e não em unidades UTF-16 de `string.length`.

Regras:

- remover espaços e quebras apenas nas extremidades antes de validar e contar;
- espaços e quebras internos contam;
- emojis combinados contam como um caractere visível;
- mensagem vazia depois do `trim` não pode ser enviada;
- a contagem oficial é do servidor;
- depois que a mensagem foi cobrada e aceita, sua contagem é imutável;
- ocultar ou excluir a mensagem apenas da visão do usuário não altera cobrança, tentativa ou conversa;
- URL em texto conta normalmente; eventual infração é assunto de moderação.

No Node, a implementação deve usar `Intl.Segmenter` com teste de compatibilidade e casos de emoji, acento combinado e quebras de linha.

### 2.7 Áudio

Áudio de cliente é cobrado e move a barra:

`caracteres equivalentes = teto(duração em segundos) × 5`

Exemplos:

- 1,1 segundo = 2 segundos faturáveis = 10 caracteres equivalentes;
- 10 segundos = 50 caracteres equivalentes;
- 60 segundos = 300 caracteres equivalentes.

Regras:

- texto e áudio do cliente podem se somar na mesma tentativa;
- áudio da profissional vale como resposta válida;
- áudio da profissional não aumenta a base remunerável;
- imagem, vídeo, presente, reação e mensagem de sistema não movem a barra;
- duração vem de metadado validado pelo servidor, com limites e tolerância contra manipulação.

O código atual já usa multiplicador 5, embora exista comentário que confunde segundo e minuto. A migração deve corrigir o contrato e os textos sem criar uma regra paralela.

### 2.8 Tentativa de qualificação

Uma tentativa é a janela objetiva em que o cliente pode formar uma conversa remunerável.

### Início

A primeira mensagem de texto ou áudio do cliente que:

- foi validada;
- foi cobrada;
- foi persistida;
- chegou quando não havia tentativa ativa nem conversa qualificada aberta

cria `QualificationAttempt`.

### Janela

- duração fixa: **3 horas**;
- começa no timestamp da primeira mensagem paga;
- não se renova a cada nova mensagem;
- todo prazo usa UTC no servidor;
- um evento ocorrido exatamente no prazo conta; depois do prazo não conta.

### Barra

`progresso = min(100, caracteres equivalentes pagos pelo cliente / 500 × 100)`

Somente o cliente move a barra. A profissional vê o estado e entende que precisa responder e estimular o cliente a continuar.

### Critérios

A tentativa qualifica quando, dentro das 3 horas:

1. o cliente acumulou pelo menos **500 caracteres equivalentes**; e
2. a profissional enviou pelo menos uma resposta válida de texto ou áudio.

Não existe mínimo de turnos.

### Resultado

- se qualificar, nasce uma `QualifiedConversation` retroativa ao início da tentativa;
- todos os caracteres equivalentes cobrados desde o início entram na base;
- se expirar, a barra zera, a profissional recebe zero e os caracteres nunca são reaproveitados;
- a próxima mensagem paga do cliente inicia uma nova tentativa;
- a nova tentativa exige uma nova resposta da profissional;
- a resposta tardia de uma tentativa expirada não pode qualificar a seguinte.

### 2.9 Conversa qualificada

Depois da qualificação:

- a conversa permanece aberta;
- novos textos e áudios pagos do cliente aumentam a base remunerável;
- bônus podem ser desbloqueados retroativamente;
- a profissional vê progresso e conquistas, mas não o valor exato em reais;
- após **3 horas sem atividade criada por um dos dois participantes**, a conversa entra em fechamento.

Para o relógio de inatividade:

- texto, áudio e mídia enviada por uma pessoa renovam atividade;
- eventos de sistema, leitura, digitação, presença, recarga ou abertura de tela não renovam;
- mídia, presente e desbloqueio continuam sem adicionar caracteres ou bônus de conversa.

O processamento pode acontecer alguns minutos depois, mas o horário lógico de fechamento é `lastParticipantActivityAt + 3h`. Uma mensagem válida concorrente deve impedir liquidação prematura.

Sessões muito longas são aceitas. Na prática, o sono tende a encerrá-las. Fechamento manual pela profissional fica fora da primeira versão.

### 2.10 Remuneração da profissional

A profissional recebe uma participação no total cobrado do cliente por texto e áudio dentro da conversa.

### Base e teto

- participação base: **40%**;
- participação máxima: **80%**;
- a diferença pertence ao Mimo e financia operação, aquisição, risco e margem;
- o produto não comunica “taxa fixa de 20%”;
- a comunicação correta é “ganhe até 80% do valor das conversas qualificadas”.

Equivalentes por caractere:

| Cliente | Cobrança | Base da profissional | Máximo da profissional |
|---|---:|---:|---:|
| Não assinante | R$ 0,05 | R$ 0,02 | R$ 0,04 |
| Assinante | R$ 0,04 | R$ 0,016 | R$ 0,032 |

O valor R$ 0,064 mencionado anteriormente foi confirmado como erro de digitação.

### Bônus V1

Os tipos e critérios ficam no código. O BackOffice só pode ativar/desativar cada bônus e alterar seu percentual.

| Bônus | Critério fixo | Acréscimo inicial |
|---|---|---:|
| Agilidade | primeira resposta válida da profissional em até 15 minutos do início da tentativa | +10 pontos percentuais |
| Engajamento | cliente alcança 1.000 caracteres equivalentes na conversa | +15 pontos percentuais |
| Conversa profunda | cliente alcança 2.000 caracteres equivalentes na conversa | +15 pontos percentuais |

Fórmula:

`participação = min(80%, 40% + bônus desbloqueados)`

Todos os bônus são retroativos:

- ao desbloquear, a nova participação incide sobre toda a base desde o início da tentativa;
- percentuais e estados ativos são fotografados no começo da tentativa;
- mudar o BackOffice só afeta tentativas futuras;
- o teto de 80% é imposto no servidor, mesmo se percentuais forem configurados incorretamente.

### Exemplos

| Cenário | Cliente paga | Participação | Profissional recebe |
|---|---:|---:|---:|
| 500 caracteres, não assinante, sem agilidade | R$ 25,00 | 40% | R$ 10,00 |
| 500 caracteres, assinante, sem agilidade | R$ 20,00 | 40% | R$ 8,00 |
| 500 caracteres, não assinante, com agilidade | R$ 25,00 | 50% | R$ 12,50 |
| 1.000 caracteres, não assinante, agilidade + engajamento | R$ 50,00 | 65% | R$ 32,50 |
| 2.000 caracteres, não assinante, todos os bônus | R$ 100,00 | 80% | R$ 80,00 |
| 2.000 caracteres, assinante, todos os bônus | R$ 80,00 | 80% | R$ 64,00 |

R$ 10 é uma expectativa saudável para muitas conversas, não uma condição de qualificação. Uma conversa assinante de 500 caracteres pode fechar em R$ 8 de repasse base e ainda ser válida.

### 2.11 Dinheiro pendente, disponível e saque

A experiência deve separar:

- **progresso:** tentativa ainda não qualificada;
- **ganho pendente/projetado:** conversa qualificada e aberta;
- **ganho disponível:** conversa fechada e liquidada;
- **saque em processamento:** valor reservado em uma solicitação;
- **sacado:** transferência concluída.

Fluxo:

`tentativa → qualificação → ganho pendente → fechamento automático → liquidação → saldo disponível → saque`

Decisões:

- qualificar não torna o dinheiro sacável imediatamente;
- o fechamento liquida automaticamente, sem botão “resgatar”;
- a profissional recebe um relatório por conversa no fechamento;
- a tela ao vivo não mostra reais por mensagem;
- o saque usa apenas saldo disponível;
- moderação não bloqueia nem reverte a liquidação.

Para evitar frações como R$ 0,016:

- débitos do cliente e lançamentos de ledger são inteiros em centavos;
- percentuais usam basis points;
- o repasse é calculado sobre o total agregado da conversa;
- arredondamento monetário ocorre uma única vez, no fechamento, com regra half-up documentada;
- JavaScript `number` de ponto flutuante não é fonte de verdade financeira.

### 2.12 Barra e incentivos na conversa

Antes de qualificar, a profissional vê:

- barra de 0% a 100%;
- tempo restante;
- quantidade necessária sem exibir uma fórmula confusa;
- estado “aguardando sua resposta” quando ainda não respondeu;
- estado “continue a conversa” quando já respondeu, mas faltam caracteres do cliente;
- estado “100% — responda antes do prazo” quando o cliente já atingiu 500 e falta a resposta.

Comportamento:

- mensagem do cliente move a barra;
- resposta da profissional muda o requisito de resposta, mas não move a barra;
- segunda mensagem consecutiva da profissional não altera progresso;
- ao expirar, a barra zera e explica que a próxima mensagem do cliente abre nova tentativa;
- ao qualificar, a barra vira um selo/estado de conversa qualificada.

Durante a conversa qualificada:

- mostrar “Conversa qualificada”;
- mostrar bônus como conquistas, por exemplo “Bônus de agilidade +10%”;
- mostrar o próximo marco de conversa;
- não mostrar `+ R$ X` em cada bolha;
- não mostrar valor projetado em tempo real para a profissional;
- no fechamento, mostrar valor bruto, participação, bônus, repasse final e horário da liquidação.

### 2.13 Créditos promocionais

Recomendação para V1:

- créditos promocionais debitados com sucesso contam para a barra exatamente como créditos comprados;
- a profissional é remunerada sobre o valor integral cobrado, independentemente da origem do saldo;
- a parte promocional é custo de aquisição do Mimo;
- ledger e analytics separam `cashFundedCents` de `promoFundedCents`;
- o CAC da campanha deve incorporar essa subvenção;
- crédito expirado ou não debitado não conta.

Isso impede que a profissional receba uma experiência diferente sem saber que o cliente usou saldo promocional.

### 2.14 Presentes, assinaturas e mídia exclusiva

Esses produtos continuam separados:

- presente tem cobrança e repasse próprios;
- desbloqueio de imagem/vídeo tem cobrança e repasse próprios;
- assinatura mensal tem cobrança, renovação e repasse próprios;
- nenhum deles move a barra;
- nenhum deles recebe bônus de conversa;
- nenhum deles substitui a resposta necessária para qualificação;
- eventos podem renovar a atividade de uma conversa aberta apenas quando representarem conteúdo efetivamente enviado por uma pessoa, mas não entram na base remunerável.

O preço mensal da assinatura pode continuar sendo uma configuração da profissional; a proibição de preço individual refere-se a texto/áudio. O desconto global de 20% no chat é independente do preço da assinatura.

O campo genérico `platformFeePercentage` não deve continuar sendo aplicado indistintamente. Cada produto precisa de regra nomeada. Para conversa, a regra passa a ser participação base + bônus + teto. Para assinatura, presente e mídia, a taxa existente pode ser preservada inicialmente, mas deve ganhar configuração explicitamente escopada.

### 2.15 Moderação V1

A primeira versão será deliberadamente simples.

No fechamento da conversa:

1. normalizar texto;
2. aplicar padrões para telefones, sequências espaçadas, e-mail, URL, `@`, “arroba”, WhatsApp, Telegram, Instagram, Pix e frases contextuais;
3. criar uma `ModerationReview` quando houver suspeita;
4. destacar a conversa no BackOffice;
5. permitir revisão manual auditada.

Regras:

- flag não reduz repasse;
- flag não bloqueia saldo;
- infração confirmada resulta em advertência, suspensão ou banimento;
- toda decisão registra responsável, motivo e data;
- acesso administrativo ao conteúdo da conversa gera log de auditoria;
- áudio, imagem, QR code e texto embutido em mídia não serão analisados em V1;
- IA, OCR e transcrição ficam para evolução futura.

### 2.16 BackOffice

### Página inicial

A home deixa de destacar:

- quantidade total de profissionais;
- quantidade total de clientes;
- “clientes trazidos”;
- rankings de compartilhamento;
- faturamento isolado como cartão de vaidade.

A tela principal vira um feed operacional de **conversas já qualificadas**:

- abertas e acontecendo agora;
- abertas aguardando o relógio de inatividade;
- liquidação pendente;
- fechadas/liquidadas recentemente;
- marcadas para moderação.

Não aparecem tentativas com “oi”, mensagens sem resposta ou tentativas expiradas.

Cada linha mostra:

- profissional;
- cliente anonimizado na listagem;
- campanha/origem;
- status;
- início e última atividade;
- caracteres equivalentes pagos;
- gasto bruto;
- participação atual ou final;
- bônus desbloqueados;
- repasse pendente ou liquidado;
- margem do Mimo;
- flag de moderação.

Abrir detalhes exige permissão adequada. Conteúdo de mensagem continua protegido por trilha de auditoria.

### Páginas adicionais

- **Campanhas:** funil e receita por campanha, criativo, site, zone e profissional anunciada.
- **Profissionais:** completude, verificação, atividade, conversão de perfil e volume de conversas qualificadas.
- **Conversas:** busca e inspeção operacional.
- **Moderação:** fila, evidências, decisão e histórico.
- **Financeiro:** ledger, conciliação, saldo pendente/disponível, saques e margem por produto.
- **Configurações:** preço global, desconto, equivalência de áudio e bônus permitidos.

### 2.17 ExoClick, campanhas e atribuição

O Mimo e a ExoClick terão visões redundantes, com responsabilidades distintas:

- ExoClick: entrega, impressão, clique, custo e otimização de mídia;
- Mimo: cadastro, recarga, mensagem paga, qualificação, receita, repasse, margem e retenção.

### Dados capturados

- `clickId`/macro de conversão;
- campanha;
- variação/criativo;
- site;
- zone;
- landing/slug;
- profissional anunciada;
- UTM;
- visitor ID próprio;
- timestamps de primeiro toque e cadastro.

### Eventos mínimos

1. `landing_view`;
2. `campaign_cta_clicked`;
3. `signup_completed`;
4. `recharge_paid`;
5. `first_paid_message`;
6. `qualification_started`;
7. `qualified_conversation`;
8. `second_qualified_conversation`;
9. `conversation_settled`.

Os eventos devem ter chave de idempotência. Postbacks para a rede saem do servidor e nunca expõem segredo no navegador.

### Métricas

- visita → CTA;
- CTA → cadastro;
- cadastro → primeira recarga;
- cadastro → primeira mensagem paga;
- primeira mensagem → primeira conversa qualificada;
- primeira → segunda conversa qualificada;
- custo por cadastro, recarga e conversa qualificada;
- receita, repasse e margem por campanha;
- perfil anunciado versus primeiro perfil visitado;
- perfil anunciado versus primeira profissional paga;
- tempo até primeira resposta, qualificação e segunda conversa.

O sistema não deve tentar reconstruir click ID onde ele nunca existiu. Dados antigos permanecem com origem antiga ou desconhecida.

### 2.18 Textos, onboarding e políticas

Todos os textos precisam refletir o marketplace:

- cliente conversa com pessoas reais;
- disponibilidade não é instantânea nem garantida;
- preço é global e explicado;
- assinatura dá desconto de 20% no chat;
- profissional recebe por conversas qualificadas e pode ganhar até 80%;
- o Mimo seleciona e modera participantes;
- não se promete taxa fixa de 20%;
- não se pede à profissional que traga audiência;
- não se chama cobrança de mensagem de “doação voluntária”.

Revisar:

- onboarding;
- login e redirecionamento;
- `/como-funciona`;
- página institucional;
- ajuda;
- termos;
- privacidade;
- banners, push e e-mails;
- metadados e SEO;
- telas de carteira e preço;
- mensagens de aprovação.

Os termos atuais afirmam ausência de controle editorial/curadoria e tratam “mimos” como doações não reembolsáveis. Isso é incompatível com a nova operação. Privacidade também precisa informar atribuição publicitária, cookies/identificadores, rede de anúncios, analytics e revisão manual de conversas. A redação final exige revisão jurídica.

---

## 3. Regras canônicas do motor de conversas

### 3.1 Estados

### Tentativa

| Estado | Significado | Próximo estado |
|---|---|---|
| `active` | prazo aberto, requisitos ainda não completos | `qualified` ou `expired` |
| `qualified` | 500 equivalentes + resposta válida dentro do prazo | cria conversa aberta |
| `expired` | prazo terminou sem ambos os requisitos | terminal |

### Conversa

| Estado | Significado | Próximo estado |
|---|---|---|
| `open` | qualificada e recebendo atividade | `settlement_pending` |
| `settlement_pending` | prazo de inatividade passou; worker obteve a posse | `settled` ou volta a `open` se houver atividade concorrente |
| `settled` | repasse e margem gravados atomicamente | terminal |

### Moderação

`not_flagged → pending_review → confirmed_violation | dismissed`

É um fluxo independente do financeiro.

### 3.2 Ordem atômica de uma mensagem paga

Para texto ou áudio do cliente:

1. autenticar remetente e relação com a sala;
2. validar destinatário, suspensão e tipo de conta;
3. normalizar e contar;
4. resolver assinatura ativa pela coleção de assinaturas, não por cache potencialmente desatualizado;
5. obter snapshot de preço;
6. verificar saldo;
7. dentro de uma transação MongoDB:
   - reservar/debitar saldo;
   - persistir mensagem com chave idempotente;
   - persistir lançamento de ledger;
   - criar/atualizar tentativa ou conversa;
   - atualizar atividade da sala;
8. confirmar a transação;
9. emitir eventos Socket e analytics;
10. fazer push/e-mail de forma assíncrona e repetível.

Se qualquer etapa financeira falhar, a mensagem paga não pode aparecer como enviada.

### 3.3 Ordem de uma resposta da profissional

1. autenticar e validar;
2. persistir texto/áudio;
3. se houver tentativa ativa e dentro do prazo, registrar a primeira resposta válida;
4. se o cliente já tiver 500 equivalentes, qualificar atomicamente;
5. se houver conversa aberta, atualizar atividade;
6. emitir progresso/qualificação;
7. não creditar saldo por essa mensagem.

### 3.4 Fronteiras e casos extremos

| Caso | Resultado obrigatório |
|---|---|
| Cliente envia 500 caracteres de uma vez, profissional responde a tempo | qualifica |
| Profissional responde primeiro, cliente chega a 500 depois e dentro do prazo | qualifica no evento que cruza 500 |
| Cliente chega a 500, profissional responde depois do prazo | tentativa expira |
| Cliente e profissional trocam mensagens de hora em hora por dias | cada tentativa tem janela própria fixa; histórico expirado não volta |
| Tentativa expira com 499 | zero para a profissional; 499 nunca migram |
| Próxima mensagem após expiração | abre nova tentativa a partir de zero |
| Resposta antiga existe, mas nova tentativa não recebeu resposta | não qualifica |
| Duplicação/retry do Socket | uma cobrança, uma mensagem e um incremento |
| Configuração muda durante tentativa | snapshot antigo vale até fechar |
| Profissional é suspensa com conversa aberta | impedir novas ações; liquidar o que já foi adquirido conforme regra, sem confisco |
| Cliente fica sem saldo no meio | rejeitar somente o novo envio; conversa existente permanece aberta |
| Usuário oculta mensagem | financeiro e contagem não mudam |
| Admin arquiva sala | histórico e ledger permanecem |
| Worker roda duas vezes | mesma chave de settlement devolve o mesmo resultado |
| Atividade chega durante settlement | comparação de versão/timestamp impede fechamento incorreto |

### 3.5 Invariantes financeiros

- soma dos débitos do cliente = receita bruta de texto/áudio da conversa;
- repasse profissional liquidado ≤ 80% da receita bruta;
- margem = receita bruta − repasse profissional;
- tentativa expirada tem repasse zero;
- uma mensagem paga pertence a no máximo uma tentativa/conversa;
- uma conversa possui no máximo uma liquidação;
- um lançamento de ledger nunca é editado ou apagado; correções são lançamentos compensatórios;
- saldo materializado deve reconciliar com o ledger;
- nenhum saque consome ganho pendente;
- valores antigos nunca são recalculados com bônus novos.

---

## 4. Estado atual encontrado no código

### 4.1 Arquitetura

- `mimo-web`: Next.js, Clerk, páginas públicas/privadas, APIs, BackOffice, pagamentos, carteiras e modelos Mongoose.
- `mimo-chat-server`: Socket.IO, presença, envio de mensagens, cobrança em tempo real e uma segunda cópia de diversos modelos Mongoose.
- MongoDB: armazenamento compartilhado pelos dois serviços.

Essa divisão torna o contrato entre repositórios crítico. Hoje existem divergências reais:

- `Room` no servidor tem `monetizationDisabled` e índice único; a versão web não;
- `Message` no servidor tem campos de áudio e entrega que não aparecem integralmente na versão web;
- `AppSettings` e `User` têm conjuntos de campos diferentes;
- defaults de preço no código (`0.005` e `0.002`) não correspondem ao alvo aprovado (`0.05` e `0.04`);
- comentários e unidades não são consistentes.

Antes do motor novo, deve existir um contrato compartilhado ou uma validação automática de paridade entre os schemas.

### 4.2 Matriz de lacunas

| Área | Hoje | Alvo | Principais pontos de código |
|---|---|---|---|
| Entrada | metadados e telas ainda admitem profissional | cadastro comum sempre cliente | `ProfileSelectionModal.tsx`, onboarding, webhook Clerk, `profileRole.ts` |
| Migração de papel | cliente pode solicitar migração | apenas fluxo administrativo | `/api/users/me/professional-migration`, Configurações |
| Aquisição profissional | landing e e-mails incentivam trazer fãs | curadoria e convite | `/como-funciona`, `creator-engagement`, `ProfessionalActivation` |
| Referral | URL, UTM e metadata da profissional | atribuição de campanha paga | `referral.ts`, layout, login, webhook |
| Perfil público | perfil vive dentro do app | landing de campanha separada | `/[username]`, nova `/c/[slug]` |
| Preço | campos globais e individuais coexistem | uma regra global | `User.chargePerChar*`, `subscriberDiscountPercentage`, Settings |
| Cobrança | `content.length`, arredonda por mensagem | graphemes/equivalentes, servidor autoritativo | `chatService.ts` |
| Repasse | crédito imediato por mensagem | liquidação por conversa | `chatService.ts`, `MicroTransaction`, Socket |
| Atomicidade | salva pagador, recebedor e transações em passos | transação Mongo + idempotência | `chatService.ts` |
| Sessões | agrupamento posterior apenas explicativo | entidades reais com estado | `earningsSessions.ts`, `exploreMetrics.ts` |
| Incentivo | `+ R$` por bolha e saldo imediato | barra, bônus e relatório final | página de chat, carteira |
| Explore | conta sessões antigas por créditos | usa conversas reais e confiança | `exploreRanking.ts`, APIs featured/search |
| Dashboard | profissionais e clientes trazidos | feed de conversas + funil pago | `/admin`, dashboard/acquisition APIs |
| Moderação | setting quase sem motor; exclusão definitiva | flag pós-fechamento + revisão auditada | AppSettings, admin rooms |
| Exclusão | rotas apagam usuário, sala, mensagem e ledger | desativação, anonimização e retenção | account/admin/webhook Clerk |
| Testes | scripts ad hoc; sem runner no `package.json` | suíte unitária, integração e E2E | ambos os repositórios |

### 4.3 Problemas financeiros atuais que impedem reaproveitamento direto

No `mimo-chat-server/src/services/chatService.ts`:

- o custo usa `content.length`;
- preço global e preço individual coexistem;
- assinatura é identificada pelo array cacheado `receiver.subscribers`;
- o recebedor é creditado imediatamente;
- taxa genérica é aplicada a mensagem, áudio, mídia e presente;
- pagador, recebedor e microtransações são salvos separadamente;
- Socket envia `balance_update` para ambos imediatamente;
- áudio é remunerado imediatamente;
- `receiverEarnings` e `platformFee` são gravados na própria mensagem.

O novo motor não deve ser implementado adicionando condicionais em volta desse fluxo. A parte financeira de texto/áudio precisa ser substituída por um serviço transacional próprio.

### 4.4 Sessões atuais não são sessões financeiras

`lib/earningsSessions.ts` e `lib/exploreMetrics.ts`:

- reconstroem blocos por intervalo;
- agregam créditos que já foram pagos;
- escondem/agrupam valores pequenos apenas na apresentação;
- não controlam direito adquirido, pendência ou liquidação;
- misturam, em alguns relatórios, mensagem, presente e mídia.

Essas rotinas não devem ser evoluídas para o motor novo. Elas permanecem apenas no adaptador de extrato histórico pré-corte e são removidas dos fluxos pós-corte.

### 4.5 Risco de perda de auditoria

Hoje existem rotas capazes de:

- apagar conta e dados relacionados;
- apagar sala e todas as mensagens;
- apagar microtransações e transações;
- excluir usuário do Mongo quando o Clerk envia `user.deleted`;
- excluir permanentemente inscrições.

No novo modelo, hard delete de registros financeiros e conversas não pode ser ação administrativa comum. Exclusão do usuário deve respeitar LGPD e obrigações de retenção: desativar acesso, remover dados não necessários e pseudonimizar o que precise ser retido. A política final deve ser validada juridicamente.

### 4.6 Pontos bons que podem ser aproveitados

- rota raiz já preserva a sensação de aplicativo;
- existe redirecionamento pós-login;
- presença, `lastSeen` e tempo de resposta já têm base;
- verificação de identidade já existe;
- Explore já tem completude e slots de descoberta;
- candidaturas externas já possuem modelo próprio;
- acesso administrativo às mensagens já cria `AuditLog`;
- crédito promocional tem estruturas de grant/usage e idempotência;
- renovação de assinatura já contém um exemplo de transação MongoDB;
- equipes têm papel próprio;
- descontos globais e preços globais já aparecem parcialmente no BackOffice.

---

## 5. Arquitetura de destino

### 5.1 Entidades novas ou reformuladas

### `QualificationAttempt`

Campos mínimos:

- `_id`;
- `roomId`, `clientId`, `professionalId`;
- `status`;
- `startedAt`, `deadlineAt`, `qualifiedAt`, `expiredAt`;
- `clientEquivalentChars`;
- `grossChargedCents`;
- `cashFundedCents`, `promoFundedCents`;
- `professionalRespondedAt`;
- `firstPaidMessageId`;
- `pricingSnapshot`;
- `bonusSnapshot`;
- `version`;
- timestamps.

Índices:

- único parcial para tentativa `active` por `roomId`;
- `deadlineAt + status` para worker;
- cliente/profissional por data;
- primeira mensagem/idempotência.

### `QualifiedConversation`

Campos mínimos:

- `_id`, `attemptId`, `roomId`, participantes;
- `status`;
- `startedAt`, `qualifiedAt`, `lastParticipantActivityAt`, `closesAt`;
- contagens de texto, áudio e equivalentes;
- receita bruta, cash e promo;
- snapshot de preço e bônus;
- bônus desbloqueados e timestamps;
- participação final em basis points;
- repasse, margem e arredondamento;
- `settlementKey`, `settledAt`;
- referência de campanha/atribuição;
- estado de moderação;
- timestamps e versão.

Índices:

- único por `attemptId`;
- único parcial de conversa `open` por `roomId`;
- `status + closesAt`;
- profissional/cliente/campanha por período;
- `settlementKey` único.

### `FinancialLedgerEntry`

Ledger imutável e de partidas reconciliáveis:

- conta;
- usuário;
- moeda;
- valor em centavos;
- direção/tipo;
- produto;
- origem financeira;
- mensagem/tentativa/conversa/transação relacionada;
- chave idempotente;
- timestamp efetivo;
- metadados de versão.

Tipos esperados:

- débito de crédito do cliente;
- consumo de crédito promocional;
- receita bruta de conversa;
- repasse profissional pendente;
- liberação de repasse;
- margem da plataforma;
- reserva/liberação de saque;
- ajuste compensatório.

`MicroTransaction` e `Transaction` antigos continuam históricos. Não se deve silenciosamente dar novos significados a tipos antigos.

### Carteiras

Separar semanticamente:

- `customerCashAvailableCents`;
- `customerPromoAvailableCents`;
- `professionalPendingCents`;
- `professionalAvailableCents`;
- `professionalReservedForWithdrawalCents`.

O ledger é fonte de verdade; campos de saldo são projeções transacionais para performance. O campo histórico `User.balance` deixa de ser atualizado depois do corte e é documentado.

### `Campaign` e atribuição

`Campaign`:

- slug, nome, status;
- origem/rede;
- ids externos;
- profissional anunciada;
- variante da landing e assets;
- destino interno;
- objetivos de conversão habilitados;
- datas e autoria.

`CampaignVisit`/`AttributionTouch`:

- visitor ID;
- click ID;
- macros/UTMs;
- campanha, criativo, site e zone;
- landing e profissional;
- timestamps;
- usuário vinculado depois do cadastro;
- first touch e signup touch imutáveis.

Pode-se evoluir `AcquisitionEvent`, mas os enums antigos não devem ser reutilizados de forma ambígua. Eventos novos precisam de vocabulário marketplace.

### `ModerationReview`

- conversa;
- padrões encontrados;
- trechos/evidências minimizados;
- status;
- prioridade;
- revisor;
- decisão, sanção e justificativa;
- timestamps;
- log de acesso.

### 5.2 Configurações do novo motor

Configuráveis no BackOffice:

- preço global não assinante: R$ 0,05;
- desconto de assinante: 20%;
- preço assinante derivado: R$ 0,04;
- equivalência do áudio: 5 por segundo;
- bônus de agilidade: ativo/inativo e percentual;
- bônus de engajamento: ativo/inativo e percentual;
- bônus de conversa profunda: ativo/inativo e percentual.

Fixos no código V1:

- prazo da tentativa: 3 horas;
- limiar de qualificação: 500;
- resposta válida: texto/áudio;
- agilidade: 15 minutos;
- engajamento: 1.000;
- conversa profunda: 2.000;
- inatividade de fechamento: 3 horas;
- participação base: 40%;
- teto: 80%;
- tipos de bônus.

Não implementar criação de bônus, vigência, editor de expressão, pesos arbitrários ou preço individual.

### 5.3 Eventos Socket novos

Exemplos de contratos:

- `customer_balance_updated`;
- `qualification_attempt_started`;
- `qualification_progress_updated`;
- `qualification_attempt_expired`;
- `conversation_qualified`;
- `conversation_bonus_unlocked`;
- `conversation_settled`;
- `professional_wallet_updated`.

Não reaproveitar um único `balance_update` para saldos com significados diferentes.

Eventos contêm versão do contrato, ids, timestamps e valores permitidos para aquele papel. O cliente não recebe informação financeira privada da profissional.

### 5.4 Workers duráveis

São necessários processos idempotentes para:

- expirar tentativas;
- detectar inatividade;
- liquidar conversas;
- executar moderação pós-fechamento;
- enviar analytics/postbacks;
- reconciliar ledger e saldos;
- recuperar tarefas interrompidas.

Timers em memória servem para presença, não para dinheiro. Os workers devem consultar estado persistido, fazer claim com versão/lease e tolerar reinício/deploy.

### 5.5 Contrato compartilhado entre repositórios

Alternativas aceitáveis:

1. pacote compartilhado versionado com schemas de domínio e eventos; ou
2. especificação JSON/TypeScript gerada e teste obrigatório de paridade.

O contrato deve cobrir:

- dinheiro e unidades;
- tipos de mensagem;
- snapshots;
- estados;
- eventos Socket;
- payloads do BackOffice;
- versionamento de engine.

Sem isso, uma alteração no Next.js pode interpretar de forma diferente o documento criado pelo Socket server.

### 5.6 Segurança e privacidade

- autorização centralizada para admin, sem IDs de fallback espalhados;
- nenhum segredo de ExoClick no cliente;
- logs sem conteúdo integral, documentos, tokens ou dados bancários;
- acesso a conversa com justificativa e `AuditLog`;
- RBAC para financeiro, moderação e campanha;
- rate limit persistente/distribuído em candidaturas e landing, não `Map` em memória;
- retenção e pseudonimização definidas por categoria;
- criptografia e acesso restrito para documentos de identidade;
- hard delete substituído por arquivamento/anonimização controlada;
- consentimento/cookies e política atualizados antes do tráfego.

---

## 6. Lógicas legadas a remover

Remover significa apagar o caminho ativo de código e a interface. Os dados já gravados permanecem conforme o documento de referência.

### 6.1 Papel e onboarding

- `components/ProfileSelectionModal.tsx`;
- opção de papel no onboarding;
- metadados `profileRoleSource` usados para escolha comum;
- promoção por `creator_landing`;
- `/api/users/me/init-professional`;
- `/api/users/me/professional-migration`;
- UI de migração em Configurações;
- qualquer PATCH administrativo genérico que permita trocar `isProfessional` sem workflow.

Substituir por cadastro cliente e provisionamento profissional administrativo.

### 6.2 Aquisição por compartilhamento

- `lib/referral.ts` e URL de perfil para aquisição;
- parâmetros `ref`/`utm_creator` como motor principal;
- persistência de referral em login/layout;
- CTA de compartilhar perfil;
- redirecionamento de usuário sem salas para onboarding de compartilhamento;
- eventos `link_shared`, `link_viewed`, `signup_attributed` de origem `profile_share`;
- `/api/professional-activation/share-click`;
- contadores `shareClickCount`;
- e-mails dizendo que a profissional precisa trazer usuários;
- `/api/cron/creator-engagement`;
- configurações `creatorEngagement*`;
- dashboard “clientes trazidos”.

Não remover os registros existentes do banco.

### 6.3 Preço individual e taxa única

- leitura/escrita de `User.chargePerCharSubscribers`;
- leitura/escrita de `User.chargePerCharNonSubscribers`;
- `User.subscriberDiscountPercentage`;
- UI profissional para desconto;
- `maxPricePerChar`;
- aplicação de `platformFeePercentage` às conversas;
- textos que prometem taxa fixa de 20%.

Para outros produtos, substituir a taxa genérica por configurações escopadas.

### 6.4 Repasse por mensagem

- crédito imediato à profissional;
- microtransação profissional por mensagem;
- `receiverEarnings` pós-corte;
- `platformFee` pós-corte na mensagem;
- `+ R$` em cada mensagem;
- notificações “o valor já entrou no saldo”;
- saldo único usado simultaneamente como créditos e ganho;
- agrupamento visual de pequenos créditos como se criasse sessões.

### 6.5 Sessões reconstruídas

- `lib/earningsSessions.ts` nos dados pós-corte;
- `lib/sessionGrouping.ts` onde tiver a mesma finalidade;
- `lib/exploreMetrics.ts` baseado em créditos antigos;
- `earningsSessionInactivityMinutes`;
- `earningsSessionMinimumCents`;
- “outros ganhos” formados para atingir mínimo visual.

Manter somente um adaptador de extrato histórico explicitamente rotulado como “antes da migração”.

### 6.6 Dashboard antigo

- cards de total/atividade usados como home;
- ordenação por clientes trazidos;
- funil ferramenta versus Explore;
- primeira/segunda profissional calculada a partir de referral antigo;
- ranking de compartilhamento;
- componentes e APIs que não servirem à nova home ou histórico.

### 6.7 Destruição de auditoria

- DELETE físico de sala/mensagens;
- DELETE de ledger/transação como ação normal;
- cascade delete da conta;
- exclusão do Mongo no webhook `user.deleted`;
- exclusão de inscrição sem política de retenção.

Substituir por estados `archived`, `deactivated`, pseudonimização e lançamentos compensatórios.

### 6.8 Código profissional procurando clientes

Qualquer ramificação em busca/Explore que permita à profissional navegar clientes como catálogo deve ser removida. Profissional recebe demanda e gerencia conversas; não existe marketplace inverso.

### 6.9 `monetizationDisabled`

Não manter um botão genérico que transforma silenciosamente uma conversa comercial em gratuita. Se necessário:

- isenção só para sala de equipe/suporte;
- motivo obrigatório;
- autorização forte;
- evento auditado;
- nenhuma tentativa comercial ativa na sala.

---

## 7. Plano de migração em fases

As fases abaixo são sequenciais por risco, embora atividades de UX, texto e dados possam ser preparadas em paralelo. Nenhuma fase autoriza alteração em produção por si só.

### Fase 0 — Congelamento conceitual e baseline

### Objetivo

Impedir que novas funcionalidades reforcem o modelo antigo enquanto a migração é construída.

### Trabalho

- aprovar este documento como fonte de produto;
- criar ADRs para qualificação, ledger, atribuição e retenção;
- catalogar valores efetivos no banco de desenvolvimento `mimo-chat-desenv`;
- fazer auditoria somente leitura do banco de produção `mimo-chat` antes de qualquer script;
- medir saldos, mensagens, transações, assinaturas, saques, salas e perfis;
- localizar todos os leitores/escritores dos campos legados;
- definir owner técnico de web, Socket, dados, jurídico e operação;
- criar plano de backup e reconciliação;
- congelar mudanças em preço, referral e carteira que não sejam correções críticas.

### Entregáveis

- baseline assinado;
- inventário de dados e unidades;
- matriz de dependências;
- plano de teste;
- data de corte ainda não ativada.

### Critério de saída

Todos os fluxos financeiros atuais estão explicados e os saldos podem ser reconciliados antes da primeira alteração.

### Fase 1 — Contratos, modelos e fundação financeira

### Objetivo

Criar a base nova sem ativá-la para usuários.

### Trabalho

- definir pacote/contrato compartilhado;
- criar modelos de tentativa, conversa, ledger, campanha e moderação;
- adicionar `billingEngineVersion` e ids de correlação às mensagens novas;
- definir carteiras separadas;
- implementar serviço de preço global;
- resolver assinatura por registro ativo;
- implementar contagem de graphemes e áudio;
- implementar transação financeira idempotente;
- implementar workers duráveis inativos;
- criar índices parciais/únicos;
- criar reconciliação automática;
- criar métricas técnicas.

### Dados

- schema aditivo;
- nenhuma reclassificação histórica;
- nenhuma escrita em coleções novas por tráfego real até validação.

### Testes

- unitários de matemática e estado;
- integração com Mongo transaction;
- concorrência e retry;
- paridade de schema entre repos.

### Critério de saída

O motor pode simular uma conversa inteira em `mimo-chat-desenv` e reconciliar centavo a centavo, sem tocar no motor atual.

### Fase 2 — Papéis e aquisição profissional controlada

### Objetivo

Eliminar a ambiguidade de cadastro antes de comprar tráfego.

### Trabalho

- cadastro comum sempre cliente;
- remover escolha de papel e migração self-service;
- unificar `CreatorApplication` e BackOffice;
- criar convite/provisionamento seguro;
- criar checklist obrigatório de publicação;
- revisar aprovação, rejeição e e-mails;
- preservar profissionais existentes;
- preparar lista das dez profissionais piloto;
- separar status de candidatura, identidade, perfil e publicação.

### Critério de saída

Um usuário anônimo só consegue virar cliente. Uma profissional só é criada/publicada por ação administrativa auditada.

### Fase 3 — Motor de tentativa, qualificação e liquidação

### Objetivo

Substituir a remuneração por mensagem pelo motor de conversa em desenvolvimento.

### Trabalho

- implementar estados e transições;
- iniciar tentativa na primeira mensagem paga;
- acumular equivalentes por 3 horas fixas;
- registrar resposta profissional;
- qualificar com 500 + resposta;
- criar conversa retroativa;
- aplicar bônus retroativos;
- fechar após 3 horas de inatividade;
- liquidar pendente → disponível;
- suportar texto e áudio;
- manter presentes/mídia/assinatura separados;
- implementar eventos Socket novos;
- impedir dupla cobrança/liquidação;
- tratar suspensão, saldo insuficiente e corrida de fechamento.

### Critério de saída

Todos os casos da seção 3.4 passam e nenhuma profissional recebe por tentativa expirada.

### Fase 4 — Chat e carteira da profissional

### Objetivo

Fazer a interface ensinar o novo comportamento.

### Trabalho

- substituir valores verdes por barra;
- mostrar resposta pendente, prazo e marcos;
- mostrar banners de qualificação e bônus;
- criar relatório de conversa fechada;
- separar pendente, disponível, reservado e sacado;
- permitir saque apenas de disponível;
- preservar extrato histórico pré-corte em seção identificada;
- revisar notificações, push e e-mails;
- revisar estimativa de custo do cliente;
- explicar assinatura e desconto;
- remover textos de saldo imediato.

### Critério de saída

Em teste de usabilidade, a profissional consegue responder: o que falta, quando começa a ganhar e quando pode sacar, sem fazer cálculo por mensagem.

### Fase 5 — Marketplace, Explore e confiança

### Objetivo

Entregar uma vitrine adequada a um cliente que ainda não conhece as profissionais.

### Trabalho

- substituir fonte de conversa qualificada;
- recalibrar ranking por atributos reais;
- criar penalidades naturais para perfil incompleto/inativo;
- expor sinais de presença, verificação e resposta;
- criar avisos de confiança;
- remover busca de clientes por profissionais;
- garantir que suspensas/ocultas não apareçam;
- validar as dez profissionais piloto em mobile/PWA.

### Critério de saída

O topo do Explore contém perfis completos e confiáveis; perfis incompletos continuam acessíveis por link interno, mas não recebem destaque indevido.

### Fase 6 — Landing e atribuição paga

### Objetivo

Conectar anúncio, autenticação e comportamento dentro do Mimo.

### Trabalho

- criar `/c/[slug]`;
- adicionar rota à lista pública;
- criar CRUD de campanha;
- capturar macros/UTMs/click ID;
- criar cookie/visitor ID e vinculação ao cadastro;
- preservar destino interno pós-login;
- registrar eventos idempotentes;
- implementar postbacks server-side;
- criar consentimento e política aplicável;
- testar bloqueadores, OAuth, PWA, iOS e Android;
- garantir que landing desativada tenha fallback seguro.

### Critério de saída

Um clique de teste pode ser rastreado até cadastro, recarga, primeira mensagem e conversa qualificada sem criar perfil público duplicado.

### Fase 7 — BackOffice marketplace

### Objetivo

Dar à operação uma visão em tempo real do que importa.

### Trabalho

- reconstruir home como feed de conversas qualificadas;
- criar detalhe com acesso auditado;
- criar painel de campanhas;
- criar painel de conversão por profissional;
- criar fila de moderação;
- criar configurações restritas;
- criar métricas de margem e promo;
- retirar métricas/abas legadas da navegação;
- centralizar autorização e remover fallback hardcoded;
- trocar deletes físicos por ações seguras.

### Critério de saída

O operador consegue responder: “o tráfego está virando conversa?”, “com quem?”, “quanto foi gasto e repassado?” e “há suspeita de contato externo?”.

### Fase 8 — Conteúdo, jurídico e remoção legada

### Objetivo

Evitar que o código e a comunicação contem histórias diferentes.

### Trabalho

- atualizar onboarding, institucional, ajuda, termos e privacidade;
- substituir `/como-funciona` por candidatura/convite coerente;
- apagar rotas, componentes, hooks e serviços listados na seção 6;
- remover cron e settings de engajamento;
- remover campos legados dos schemas ativos, mantendo-os fisicamente no Mongo;
- criar adaptador histórico mínimo;
- remover feature flags temporárias da migração;
- atualizar documentação e diagramas;
- executar busca textual por “taxa 20%”, “traga seus fãs”, “compartilhe”, “ganho por mensagem” e equivalentes.

### Critério de saída

Nenhuma jornada ativa, endpoint público, configuração ou texto promove o modelo ferramenta.

### Fase 9 — Ensaio completo em desenvolvimento

### Ambiente

Somente `mimo-chat-desenv`.

### Trabalho

- clonar uma amostra anonimizada/gerar fixtures realistas;
- executar migração de saldos e índices;
- testar contas cliente, profissional, equipe e admin;
- simular campanha → cadastro → recarga → conversa → saque;
- testar assinante/não assinante, cash/promo, texto/áudio;
- testar relógio e worker com tempo acelerado;
- testar concorrência, falha parcial e retry;
- testar deploy fora de ordem;
- testar exportação de auditoria;
- teste visual mobile e PWA;
- carga com múltiplas mensagens simultâneas;
- reconciliar antes/depois.

### Critério de saída

Zero divergência de saldo, zero liquidação duplicada, zero campo de preço individual influenciando cobrança e todos os fluxos E2E críticos aprovados.

### Fase 10 — Preparação do corte

### Trabalho

- selecionar data/hora `marketplaceCutoverAt`;
- fazer backup verificável;
- registrar checksums/contagens;
- preparar scripts idempotentes com dry-run;
- preparar manutenção curta para envio pago;
- publicar frontend compatível com os eventos novos;
- publicar schemas/índices aditivos;
- deixar workers prontos e desligados;
- preparar rollback operacional de implantação;
- avisar profissionais e equipe;
- confirmar textos e políticas publicados;
- confirmar as dez profissionais;
- validar campanha sem ativar gasto.

Rollback aqui é segurança de implantação, não conservação indefinida do modelo antigo.

### Fase 11 — Corte de produção

### Ambiente

Banco alvo: `mimo-chat`. Qualquer escrita exige ordem explícita no momento da execução.

### Sequência

1. pausar brevemente novos envios pagos;
2. verificar que não há processamento financeiro em voo;
3. capturar snapshot de saldo e transações;
4. gravar marcador de corte;
5. mapear saldos antigos para as novas carteiras, sem alterar o valor antigo;
6. classificar documentos sem versão como `legacy_v1` por convenção;
7. ativar o novo chat server;
8. ativar workers;
9. ativar UI nova;
10. fazer smoke test com contas controladas;
11. liberar envios;
12. acompanhar reconciliação em tempo real;
13. não ligar ExoClick até o gate financeiro e de UX ser aprovado.

Mensagens anteriores ao corte mantêm custo, crédito e taxa já registrados. Não serão transformadas em tentativas novas nem recalculadas.

### Fase 12 — Piloto de tráfego

### Trabalho

- campanha pequena e limitada;
- uma ou poucas landings/profissionais;
- monitorar por coorte;
- atendimento humano disponível;
- revisar diariamente flags, reclamações e divergências;
- comparar ExoClick e Mimo;
- ajustar criativo e ranking, não regras financeiras no meio de tentativas;
- aumentar orçamento somente após repetição consistente.

### Gates

- conversão landing → cadastro;
- cadastro → recarga;
- recarga → primeira mensagem;
- tentativa → qualificação;
- tempo de resposta;
- custo por conversa qualificada;
- margem depois de mídia e promo;
- segunda conversa qualificada;
- taxa de moderação e suspensão;
- estabilidade/reconciliação.

### Fase 13 — Limpeza final

Após estabilização curta e aprovação:

- remover compatibilidade transitória;
- remover leituras e writes antigas;
- excluir código morto;
- arquivar documentação antiga;
- manter somente o visualizador histórico necessário;
- confirmar via busca e cobertura que nenhum campo legado influencia o produto;
- atualizar este documento para “implementado” com links de PRs e evidências.

---

## 8. Migração de dados

### 8.1 Regra geral

- adicionar antes de remover;
- migrar de forma idempotente;
- nunca inferir dados inexistentes;
- nunca reprecificar o passado;
- preservar ids e timestamps;
- registrar versão e execução;
- dry-run obrigatório;
- relatório de antes/depois;
- backup restaurável.

### 8.2 Saldos

Proposta:

- cliente: `User.balance` → `customerCashAvailableCents`;
- cliente: `promotionalBalance` → `customerPromoAvailableCents`;
- profissional: `User.balance` → `professionalAvailableCents`;
- profissional: pendente inicia em zero;
- saque pendente precisa ser reconciliado antes de calcular disponível/reservado;
- equipe deve ser auditada separadamente;
- valor antigo permanece no campo original como fotografia de corte e não é mais atualizado.

Antes disso, é obrigatório verificar unidades e inconsistências entre `Transaction`, `MicroTransaction`, `WithdrawRequest` e telas. O código contém usos que alternam centavos e reais.

### 8.3 Mensagens

- documentos antigos permanecem como estão;
- ausência de `billingEngineVersion` significa `legacy_v1`;
- mensagens pós-corte usam `marketplace_v2`;
- novas mensagens guardam contagem oficial, preço, funding, tentativa/conversa e idempotência;
- `receiverEarnings`/`platformFee` antigos permanecem históricos;
- novos documentos não fingem ganho imediato usando esses campos.

### 8.4 Aquisição

- referral antigo continua associado ao usuário/evento histórico;
- campanha nova não sobrescreve `acquiredByProfessionalId`;
- criar campos próprios de atribuição;
- usuário sem click ID permanece `direct`/`unknown`;
- não converter UTMs antigas em campanha paga.

### 8.5 Conversas antigas

- não fazer backfill de `QualifiedConversation` a partir de sessões reconstruídas;
- mostrar histórico antigo através de adaptador separado;
- métricas marketplace começam no corte;
- dashboards permitem filtro “histórico anterior ao corte” apenas onde auditoria exigir.

---

## 9. Plano de testes

### 9.1 Unidade

- graphemes simples, emoji, ZWJ, acento combinado, espaços e quebras;
- arredondamento de áudio;
- preço assinante;
- basis points e teto;
- snapshot de configuração;
- transições de estado;
- deadlines exatos;
- bônus retroativos;
- arredondamento final;
- regex normalizada.

### 9.2 Integração

- débito + mensagem + attempt em uma transação;
- saldo insuficiente;
- promo e cash misturados;
- assinatura expirada durante conversa;
- retry com mesma idempotency key;
- dois eventos concorrentes cruzando 500;
- resposta e expiração concorrentes;
- mensagem e settlement concorrentes;
- worker duplicado;
- suspensão durante conversa;
- saque durante liquidação;
- postback duplicado.

### 9.3 E2E

- anônimo por landing, cadastro e destino correto;
- cadastro direto;
- cliente não vê escolha de papel;
- candidata não vira profissional sem admin;
- perfil incompleto rankeia abaixo e exibe aviso;
- 499 expira;
- 500 + resposta qualifica;
- áudio + texto qualifica;
- tentativa expirada não carrega histórico;
- bônus aparecem sem valor em reais;
- relatório final e saque;
- fila de moderação;
- feed do BackOffice;
- campaign attribution completa;
- extrato antigo ainda conciliável.

### 9.4 Regressão dos produtos separados

- recarga PIX/cartão;
- crédito promocional;
- assinatura e renovação;
- desconto de assinante;
- presente;
- mídia bloqueada;
- upload;
- identidade;
- push;
- equipe/suporte;
- saque e rejeição de saque.

---

## 10. Observabilidade e alertas

Criar métricas e alertas para:

- falha de transação de mensagem;
- divergência ledger × saldo;
- tentativa ativa vencida há mais de tolerância;
- conversa vencida não liquidada;
- liquidação duplicada bloqueada;
- postback pendente/falhado;
- volume anormal de tentativa expirada;
- tempo de resposta por profissional;
- taxa de qualificação;
- gasto com promo versus receita;
- margem abaixo do esperado;
- erros por versão de cliente/Socket;
- divergência de preço entre UI e servidor;
- hard delete tentado;
- acesso administrativo a mensagens.

Logs financeiros devem usar ids e valores, não texto da conversa ou segredos.

---

## 11. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Cobrança sem mensagem ou mensagem sem cobrança | transação Mongo única e idempotência |
| Crédito profissional duplicado | `settlementKey` único e ledger imutável |
| Serviço reinicia antes de fechar | worker persistente baseado em estado |
| Schema diverge entre repos | contrato compartilhado + teste de paridade |
| Profissional entende que perdeu dinheiro | barra clara, relatório e educação |
| Cliente acha preço confuso | preço global e preview antes do envio |
| Tráfego chega a perfis ruins | piloto curado e gate de completude |
| “Online” falso | presença real e `lastSeen` |
| Contato externo por imagem/áudio | reconhecer limite V1, revisão manual e evolução |
| Promo destrói margem | separar funding e incluir no CAC |
| Termos incompatíveis | revisão jurídica antes da campanha |
| Dados de auditoria apagados | remover hard delete e aplicar retenção/pseudonimização |
| Dois modelos ativos indefinidamente | corte único e fase obrigatória de limpeza |

---

## 12. Definição de pronto

A refatoração só está concluída quando:

- cadastro comum sempre cria cliente;
- não existe escolha ou migração self-service para profissional;
- profissional só entra por fluxo controlado;
- não existe preço de mensagem por profissional;
- preço e desconto globais são a única fonte ativa;
- texto usa graphemes e áudio usa 5 equivalentes/segundo;
- tentativa fixa de 3h e regra 500 + resposta estão implementadas;
- histórico expirado nunca reaparece;
- repasse só nasce de conversa qualificada;
- bônus são retroativos, versionados e limitados a 80%;
- dinheiro pendente e disponível estão separados;
- liquidação é atômica, idempotente e reconciliável;
- barra substituiu valor por mensagem;
- Explore usa conversas reais e sinais de confiança;
- landing pública é de campanha, não perfil duplicado;
- atribuição chega até conversa e margem;
- dashboard principal lista conversas qualificadas;
- moderação cria flag sem interferir no repasse;
- hard deletes financeiros/conversacionais foram retirados;
- termos, privacidade e mensagens foram atualizados;
- código de referral, engajamento, taxa fixa e sessões reconstruídas saiu do fluxo ativo;
- dados históricos permanecem documentados;
- não existem flags permanentes para voltar ao modelo ferramenta;
- todos os testes e gates de corte passaram.

---

## 13. Fora da V1

- IA para qualidade de conversa;
- IA/OCR/transcrição para moderação;
- bloqueio em tempo real de contato;
- fechamento manual pela profissional;
- preço individual;
- bônus criados dinamicamente;
- sessões com regra adaptativa;
- garantia de resposta;
- estorno por falta de resposta;
- perfil público completo;
- bot de atendimento fingindo ser a profissional;
- remuneração baseada em nota subjetiva.

---

## 14. Decisões que podem ser calibradas sem mudar o conceito

Os seguintes valores podem ser validados durante o piloto sem reabrir a arquitetura:

- peso exato dos sinais do Explore;
- tamanho mínimo de amostra para exibir tempo de resposta;
- faixas públicas de mensagens/conversas;
- padrões e prioridade da fila de moderação;
- quais conversões enviar de volta à ExoClick;
- tolerância operacional do worker;
- orçamento e tamanho das coortes.

Os seguintes pontos exigem mudança formal deste documento:

- prazo de 3 horas;
- limiar de 500;
- regra de resposta;
- participação base/teto;
- tipos e critérios dos bônus;
- tratamento de créditos promocionais;
- quais produtos entram na base da conversa;
- regra de corte e retenção.

---

## 15. Ordem recomendada para começar

Quando a implementação for autorizada, as três primeiras entregas devem ser:

1. contrato de domínio + testes de matemática/estado;
2. ledger transacional + tentativa/conversa em `mimo-chat-desenv`;
3. remoção da escolha de papel e profissionalização controlada.

Só depois entram barra, Explore, landing, dashboard e compra de tráfego. A campanha deve testar um Mimo financeiramente correto e com oferta confiável, não servir como teste de infraestrutura básica.

---

## 16. Inventário de impacto no código

Este inventário é uma orientação de escopo, não uma ordem para editar todos os arquivos mecanicamente. Cada item deve ser confirmado novamente no início da implementação.

### 16.1 `mimo-chat-server`

| Arquivo/área | Ação esperada |
|---|---|
| `src/services/chatService.ts` | substituir cobrança/repasse de texto e áudio; separar produtos; usar transação, idempotência, snapshots e novas entidades |
| `src/index.ts` | versionar eventos Socket; trocar `balance_update`; integrar progresso, qualificação e settlement; restringir isenção de monetização |
| `src/services/responseTimeService.ts` | revisar definição, amostra e estatística exibida |
| `src/services/acquisitionAnalyticsService.ts` | retirar referral como origem comercial ativa; emitir eventos marketplace |
| `src/services/emailService.ts` | remover mensagens de ganho imediato/referral e adaptar notificações |
| `src/services/pushService.ts` | adaptar eventos e impedir conteúdo sensível em push |
| `src/models/User.ts` | remover campos legados do schema ativo; adicionar carteiras ou importar contrato compartilhado |
| `src/models/AppSettings.ts` | substituir configurações ambíguas; adicionar bônus permitidos |
| `src/models/Message.ts` | adicionar versão, idempotência, equivalentes, funding e vínculos |
| `src/models/Room.ts` | alinhar schema web; remover bypass genérico; adicionar arquivamento se necessário |
| `src/models/MicroTransaction.ts` | tornar somente histórico ou migrar produtos separados ao ledger |
| `src/models/Transaction.ts` | normalizar uso futuro e unidades |
| `src/models/AcquisitionEvent.ts` | versionar taxonomia marketplace |
| `src/models/CustomerRelationship.ts` | desacoplar origem de preço/repasse |
| `src/models/index.ts` | exportar entidades/contratos novos |
| `src/utils/database.ts` | garantir transaction/session e opções compatíveis |
| novos serviços | `pricing`, `qualification`, `conversationSettlement`, `ledger`, `moderation`, `campaignAttribution`, workers |

### 16.2 Entrada, autenticação e onboarding no `mimo-web`

| Arquivo/área | Ação esperada |
|---|---|
| `app/page.tsx` | preservar raiz como entrada de aplicativo |
| `proxy.ts` | tornar somente `/c/[slug]` e assets necessários públicos |
| `app/login/page.tsx` | trocar referral por atribuição de campanha e destino seguro |
| `app/sso-callback/page.tsx` | preservar campanha/destino sem conceder papel |
| `lib/postAuthRedirect.ts` | validar allowlist de destinos internos |
| `app/(app)/onboarding/page.tsx` | jornada única de cliente; remover compartilhamento |
| `app/(app)/layout.tsx` | remover captura de referral e redirect de “zero salas” para onboarding de criadora |
| `components/ProfileSelectionModal.tsx` | excluir |
| `lib/profileRole.ts` | excluir escolha client-side; substituir por política server-side mínima |
| `lib/referral.ts` | retirar do produto ativo |
| `app/api/webhooks/clerk/route.ts` | criar cliente por padrão; nunca promover por unsafe metadata; não apagar Mongo no `user.deleted` |
| `app/api/users/me/init-professional/route.ts` | excluir |
| `app/api/users/me/professional-migration/route.ts` | excluir |
| `app/(app)/settings/page.tsx` | remover migração e preço/desconto individual |
| `app/api/users/me/route.ts` | impedir troca genérica de papel/preço e alinhar carteiras |

### 16.3 Profissionais

| Arquivo/área | Ação esperada |
|---|---|
| `app/como-funciona/page.tsx` e componentes | transformar em candidatura coerente ou substituir por nova rota |
| `app/api/creator-applications/route.ts` | manter captação, endurecer rate limit e consentimentos |
| `models/CreatorApplication.ts` | renomear/versionar semântica e adicionar consent version |
| `app/api/backoffice/creator-applications/[id]/route.ts` | corrigir para operar a coleção de candidaturas, não `User` |
| `app/admin/creator-applications/page.tsx` | integrar o workflow real |
| `app/aguardando-aprovacao/page.tsx` | separar candidatura, identidade e publicação |
| `app/api/users/me/identity-verification/route.ts` | não publicar automaticamente sem checklist |
| `app/api/backoffice/identity-verifications/*` | integrar status de publicação |
| `models/ProfessionalActivation.ts` | migrar para recrutamento/onboarding; arquivar campos de share |
| `app/(app)/(tabs)/activation/page.tsx` | remover meta de compartilhamento; reutilizar somente se virar onboarding interno |
| `app/api/team/activation/*` | adaptar equipe para recrutamento/qualidade, não aquisição de fãs |
| `app/api/admin/professional-emails/route.ts` | atualizar linguagem e finalidade |

### 16.4 Chat, perfil e carteira

| Arquivo/área | Ação esperada |
|---|---|
| `app/(app)/chat/[userId]/page.tsx` | barra, estados, bônus, novos sockets, custos e retirada de indicadores em reais |
| `app/(app)/chat/[userId]/layout.tsx` | revisar carregamento/contratos |
| `app/(app)/chat/[userId]/info/page.tsx` | sinais de confiança e regras comerciais |
| `app/(app)/[username]/page.tsx` | perfil interno único; sinais de confiança e avisos |
| `app/(app)/[username]/chat/page.tsx` | consolidar/retirar duplicação de fluxo de chat |
| `app/(app)/(tabs)/chats/page.tsx` | status de tentativa/conversa e banners coerentes |
| `components/AudioRecorder.tsx` | preview de custo por equivalentes |
| `components/AudioPlayer.tsx` | contrato de duração |
| `components/MediaComposerSheet.tsx` | deixar claro o que não move a barra |
| `components/PricingGuideModal.tsx` | preço global e regra de conversa |
| `components/BalanceDisplay.tsx` | saldo correto por papel |
| `app/(app)/(tabs)/wallet/page.tsx` | separar pendente/disponível/reservado e novo relatório |
| `app/(app)/(tabs)/wallet/statement/page.tsx` | extrato novo + histórico pré-corte separado |
| `components/wallet/WalletStatement.tsx` | consumir ledger/conversas reais |
| `app/api/users/me/earnings/route.ts` | substituir agregação antiga |
| `app/api/users/me/wallet-dashboard/route.ts` | usar novas carteiras |
| `app/api/users/me/wallet-sessions/route.ts` | substituir; conservar adaptador histórico |
| `lib/earningsSessions.ts` | limitar ao legado, sem uso no marketplace |
| `lib/sessionGrouping.ts` | remover do motor ativo |
| `app/api/withdraw/route.ts` | sacar somente disponível com reserva atômica |
| `app/api/admin/withdrawals/*` | ajustar rejeição/liberação ao ledger |

### 16.5 Explore e confiança

| Arquivo/área | Ação esperada |
|---|---|
| `app/(app)/(tabs)/search/page.tsx` | vitrine apenas para cliente; remover catálogo de clientes |
| `app/api/users/featured/route.ts` | filtros/ranking novo e métricas de confiança |
| `app/api/users/search/route.ts` | contrato marketplace e avisos |
| `lib/exploreRanking.ts` | recalibrar sinais sem flag de elegibilidade |
| `lib/exploreMetrics.ts` | usar `QualifiedConversation`, não créditos reconstruídos |
| `app/api/admin/settings/explore-preview/route.ts` | preview do ranking novo |
| `components/admin/settings/SettingsExplorePage.tsx` | mostrar critérios permitidos, sem rule builder arbitrário |
| `app/api/users/[id]/route.ts` e `username/[username]` | expor somente sinais públicos aprovados |

### 16.6 Campanha e aquisição

| Arquivo/área | Ação esperada |
|---|---|
| nova `app/c/[slug]/page.tsx` | landing pública dinâmica |
| novo CRUD de campanhas | gestão de slug, criativo, profissional e status |
| `app/api/acquisition/events/route.ts` | versionar e receber eventos permitidos |
| `models/AcquisitionEvent.ts` | separar eventos antigos e novos |
| `models/CustomerRelationship.ts` | retirar efeito comercial da origem |
| `lib/acquisitionAnalytics.ts` | funil marketplace |
| `lib/clientAcquisitionAnalytics.ts` | substituir/refatorar por atribuição paga |
| `app/admin/acquisition/page.tsx` | virar painel de campanhas |
| `app/api/admin/acquisition-metrics/route.ts` | métricas de mídia → conversa/margem |
| `docs/acquisition-metrics.md` | arquivar como especificação do modelo anterior depois do corte |
| novo serviço de postback | entrega server-side, retry e idempotência |

### 16.7 BackOffice, configurações e moderação

| Arquivo/área | Ação esperada |
|---|---|
| `app/admin/page.tsx` | feed de conversas qualificadas |
| `app/api/admin/dashboard/route.ts` | query operacional nova |
| `components/admin/ActivityChart.tsx`, `StatsCard.tsx` | retirar da home se forem vaidade; reutilizar apenas com função clara |
| `components/admin/ProfessionalsTable.tsx` | completude, confiança e conversão |
| `components/admin/ClientsTable.tsx` | foco operacional/financeiro, sem aquisição por criadora |
| `components/admin/RoomsTab.tsx` | estados reais e moderação |
| `app/api/admin/rooms/route.ts` | listar conversas reais |
| `app/api/admin/rooms/[roomId]/messages/route.ts` | manter autorização e auditoria |
| `app/api/admin/rooms/[roomId]/route.ts` | substituir DELETE por arquivamento |
| `app/admin/users/[clerkId]/page.tsx` | retirar exclusão destrutiva e edição livre de papel/preço |
| `app/api/admin/users/[clerkId]/route.ts` | RBAC, sanção e pseudonimização |
| `components/admin/settings/SettingsPricingPage.tsx` | preço global/desconto derivado |
| `components/admin/settings/SettingsChatPage.tsx` | remover sessão visual antiga; mostrar bônus permitidos |
| `components/admin/settings/SettingsPlatformPage.tsx` | retirar taxa genérica de conversa |
| `hooks/admin/useSettings.ts` e `types/admin.ts` | contratos novos |
| `app/api/admin/settings/route.ts` | validação, cap de 80%, snapshots futuros |
| nova fila de moderação | padrões, decisão, sanção e auditoria |
| `lib/adminAuth.ts` e rotas admin | centralizar RBAC e remover fallback espalhado |

### 16.8 Financeiro e produtos adjacentes

| Arquivo/área | Ação esperada |
|---|---|
| `models/Transaction.ts`, `MicroTransaction.ts` | histórico/versionamento e migração ao ledger |
| `models/WithdrawRequest.ts` | reserva de saldo e idempotência |
| `models/CreditCampaign.ts`, `CreditGrant.ts`, `CreditUsage.ts` | separar funding cash/promo |
| `lib/creditCampaign.ts` | consumo promocional compatível com qualificação |
| `lib/subscriptionBilling.ts` | manter produto separado e fonte de assinatura |
| `models/Subscription.ts` | autoridade de desconto ativo |
| `app/api/users/[id]/subscribe/route.ts` | integração com ledger sem afetar barra |
| `app/api/cron/renew-subscriptions/route.ts` | preservar renovação e isolar regra de taxa |
| `app/api/chats/gift/route.ts` e chat server | produto separado |
| `app/api/chats/media/*` e unlock | produto separado |
| `app/api/gift/claim/route.ts` | validar integração de promo |
| `app/api/webhooks/asaas/*`, `abacatepay` | padronizar centavos/idempotência |
| `app/api/balance/[userId]/route.ts` | retornar a carteira correta, sem saldo único ambíguo |

### 16.9 Privacidade, exclusão e textos

| Arquivo/área | Ação esperada |
|---|---|
| `app/api/users/me/account/route.ts` | substituir cascade delete por workflow de desativação/pseudonimização |
| webhook Clerk `user.deleted` | preservar o registro necessário e desvincular autenticação |
| tabelas admin de usuários/profissionais | retirar botão de exclusão física |
| `app/termos-de-uso/page.tsx` | contrato marketplace e distinção de produtos |
| `app/politica-de-privacidade/page.tsx` | ads, cookies, atribuição, moderação e retenção |
| `app/institucional/page.tsx` | posicionamento marketplace |
| `app/ajuda/page.tsx` | preço, qualificação, saque e sanções |
| `app/layout.tsx` | metadata/SEO |
| e-mails/push/banners | retirar promessas e instruções do modelo antigo |
| `app/api/cron/creator-engagement/route.ts` | excluir |
| settings `creatorEngagement*` | retirar schema, API e UI ativos |

### 16.10 Testes e ferramentas

Hoje os `package.json` não definem um runner de testes e os arquivos encontrados são scripts de diagnóstico. A migração precisa adicionar:

- runner unitário;
- banco isolado para integração;
- fixtures versionadas;
- testes de contrato entre os repositórios;
- relógio falso;
- testes de concorrência;
- E2E de navegador;
- check de migrations em dry-run;
- check estático que proíba leitores/escritores de campos legados.

Scripts existentes com conexão direta ou exclusões (`clear-withdrawals.js`, `populate_*`, `scripts/test-*`) devem ser inventariados e protegidos para não serem confundidos com ferramentas de produção.
