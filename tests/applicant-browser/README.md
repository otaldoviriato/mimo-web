# Cadastro de candidatas — verificação isolada

Também cobre o programa de indicações: `node scripts/test-professional-referrals-browser.cjs` verifica a tela real em quatro larguras, estados, progresso e cópia do link, com dados fictícios. `npm run test:referrals` testa saques líquidos acumulados, idempotência, rollback simulado, carteiras legadas e autorização da API. Os testes transacionais usam um adaptador em memória; a concorrência real do MongoDB e callbacks reais do Asaas precisam de homologação. A integração exige MongoDB com suporte a transações e `ASAAS_WEBHOOK_AUTH_TOKEN` (ou o alias legado `ASSAS_WEBHOOK_AUTH_TOKEN`) configurado; callbacks sem autenticação são recusados.

Esta fixture importa o formulário e o banner reais, substitui apenas a sessão Clerk e intercepta APIs no navegador. Não lê `.env` do aplicativo nem acessa serviços remotos.

1. Execute `npx next dev tests/applicant-browser --webpack --hostname 127.0.0.1 --port 3012` na raiz de mimo-web.
2. Disponibilize Playwright em `NODE_PATH` e execute `node scripts/test-applicant-browser.cjs` (usa Edge headless).

Verifica username escolhido manualmente sem preenchimento automático, placeholder do avatar, seleção/recorte/troca da foto, ausência do controle nativo de arquivo, máscara DD/MM/AAAA e envio ISO, maioridade no cliente, retomada após reload, ausência de overflow horizontal e banner/navegação em 320, 360, 768 e 1280 pixels. Capturas ficam em `scratch/applicant`.

Os handlers de cadastro e indicação são exercitados com doubles de Clerk/MongoDB por `npm run test:applicant`. O servidor de chat inclui os bloqueios comerciais em `npm test`.

Limites: email/Google reais, envio ao GCS, unicidade sob concorrência no MongoDB e aprovação com notificações externas ainda precisam de homologação com credenciais e dados de desenvolvimento. Os índices únicos existentes de clerkId/email/username são preservados; não há migração.
