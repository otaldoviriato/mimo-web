# Métricas de aquisição e relacionamento

## Objetivo

Medir separadamente os loops de ferramenta (link próprio) e marketplace (Explorar), atribuir receita à origem da relação e acompanhar se cada relação cliente–profissional continua ativa depois de 7 e 30 dias.

## Eventos

| Evento | Momento do registro | Deduplicação |
| --- | --- | --- |
| `link_shared` | Depois de o compartilhamento nativo concluir ou o link ser copiado | ID gerado por ação de compartilhamento |
| `link_viewed` | Abertura de perfil com `ref` válido da própria profissional | visitante + profissional + dia |
| `signup_attributed` | Criação do usuário pelo webhook do Clerk com referência válida | usuário criado |
| `first_recharge` | Primeiro webhook de recarga paga do cliente | cliente |
| `first_paid_message` | Primeira mensagem ou áudio pago em cada relação | cliente + profissional |
| `explore_profile_viewed` | Clique em um perfil a partir do Explorar | cliente + profissional + dia |
| `professional_consumed` | Primeira transação paga com a primeira ou segunda profissional distinta | cliente + posição |
| `gmv_recorded` | Cada mensagem, áudio, desbloqueio de imagem ou presente pago | ID da operação financeira |

Todos os eventos usam uma chave única (`dedupeKey`). Reentregas de webhook, reconexões e tentativas repetidas não podem aumentar a mesma métrica duas vezes.

## Relação cliente–profissional

`CustomerRelationship` é uma projeção materializada criada no primeiro consumo pago. Ela mantém primeira e última transação, GMV acumulado, quantidade de eventos pagos, posição da profissional para aquele cliente e os marcos de retenção.

A origem é congelada quando a relação começa, nesta prioridade:

1. `profile_share`: o cadastro foi atribuído ao link daquela profissional;
2. `explore`: o cliente visitou o perfil pelo Explorar nos 30 dias anteriores;
3. `first_paid_message`: é a primeira relação paga do cliente sem atribuição anterior;
4. `direct`: relação posterior sem evidência de link ou Explorar;
5. `unknown`: usado somente quando a origem não pôde ser resolvida.

O GMV do período é calculado pelos eventos financeiros ocorridos dentro do filtro de datas e agrupado pela origem congelada da relação. O GMV acumulado mostrado na linha de uma relação cobre toda a vida daquela relação.

## Retenção

- D7: existe uma nova transação paga pelo menos 7 dias depois da primeira transação da relação.
- D30: existe uma nova transação paga pelo menos 30 dias depois da primeira transação da relação.
- As taxas incluem no denominador apenas relações que já completaram a idade necessária.
- Relações ainda jovens aparecem como `pendente`, não como perda.

Essa é uma medida de retenção acumulada (retornou depois do marco), não uma janela de atividade exclusiva no sétimo ou trigésimo dia.

## Back office

A página `/admin/acquisition` oferece filtros de 30, 90 e 180 dias e mostra:

- funil de link compartilhado até primeira mensagem paga;
- visitas vindas do Explorar;
- primeira e segunda profissional consumidas;
- GMV e retenção madura por origem;
- até 100 relações recentes, com origem, ordem, GMV e estado de D7/D30;
- início da cobertura da nova instrumentação.

## Plano de implantação

1. Publicar primeiro o `mimo-web`, que cria os eventos de aquisição, os webhooks e o painel.
2. Publicar em seguida o `mimo-chat-server`, que materializa relações e GMV a partir do consumo pago.
3. Fazer smoke test em desenvolvimento: compartilhar e abrir um link, criar cadastro atribuído, confirmar recarga, visitar via Explorar e enviar mensagem paga.
4. Conferir no painel se cada evento aparece uma única vez após repetir requests e reconectar o socket.
5. Só então promover os dois serviços para produção e registrar a data/hora como início oficial da cobertura.
6. Manter dados históricos fora dos indicadores até executar um backfill controlado. Compartilhamentos e visitas anteriores não são recuperáveis; transações antigas podem ser reconstruídas, mas terão origem parcial.

## Alertas operacionais

- Uma falha analítica nunca bloqueia mensagem, presente ou débito; ela é registrada no log do servidor. A operação financeira continua sendo a fonte para um eventual backfill.
- Atribuição por Explorar usa uma janela de 30 dias e último toque dentro dessa origem.
- Links abertos por robôs ou previews podem gerar visualização. Se esse volume se tornar relevante, deve-se adicionar filtragem de user-agent ou um evento confirmado no cliente após interação.
