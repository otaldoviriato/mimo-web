import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';

// Carrega variáveis do .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function runTest() {
    try {
        // Importações dinâmicas para garantir que o dotenv do Next foi inicializado
        const { connectToDatabase } = await import('../lib/db');
        const { User } = await import('../models/User');
        const { sendPushNotification } = await import('../lib/push');

        console.log('Iniciando teste de notificações push multicast...');
        await connectToDatabase();
        console.log('Banco de dados conectado.');

        const clerkIdTeste = 'user_test_notif_multicast_999';

        // 1. Limpa usuário anterior se existir
        await User.deleteOne({ clerkId: clerkIdTeste });

        // 2. Cria usuário de teste com tokens FCM inválidos para simular falha no envio
        const tokenInvalido1 = 'dYPDtWZlFVswy4LnBZNBwH:APA91bFw-SWatUWlq534Y_9VdRW5uyz5VUGoC-9mK9ep00TLaYeOqwov6KuSI5oPBaqfT3NR0jpSG-XQufN7I8kwk41in6-QXDqpb9FpkzoQhmZq-O-cgnE'; // token de log do usuário
        const tokenInvalido2 = 'token_totalmente_invalido_de_teste_fcm_9999999999999999999999999999';

        console.log('Criando usuário de teste com 2 tokens...');
        const user = await User.create({
            clerkId: clerkIdTeste,
            username: 'test_notif_multicast',
            email: 'test_notif_multicast@mimo.com.br',
            balance: 0,
            fcmTokens: [tokenInvalido1, tokenInvalido2],
            fcmToken: tokenInvalido1 // Legado
        });

        console.log('Usuário criado com tokens:', user.fcmTokens);

        // 3. Dispara a notificação de push usando nossa nova lógica
        console.log('Disparando sendPushNotification para o usuário de teste...');
        const result = await sendPushNotification(
            clerkIdTeste,
            'Mensagem de Teste Multicast',
            'Corpo do teste multicast',
            { roomId: 'sala_teste', senderId: 'sender_teste' }
        );

        console.log('Resultado do envio do push:', result);

        // 4. Consulta o usuário após o envio para checar se a limpeza de tokens inválidos funcionou
        const updatedUser = await User.findOne({ clerkId: clerkIdTeste });

        if (!updatedUser) {
            throw new Error('Usuário de teste sumiu do banco de dados!');
        }

        console.log('Tokens restantes no array fcmTokens:', updatedUser.fcmTokens);
        console.log('Token legado fcmToken restante:', updatedUser.fcmToken);

        // O teste é bem sucedido se o token inválido 2 for limpo e o válido 1 for mantido
        const limpouApenasInvalido = !updatedUser.fcmTokens.includes(tokenInvalido2) && updatedUser.fcmTokens.includes(tokenInvalido1);

        if (limpouApenasInvalido) {
            console.log('\n✅ TESTE BEM SUCEDIDO!');
            console.log('O Firebase rejeitou o token inválido (removido do banco) e aceitou o token teoricamente ativo (mantido no banco).');
        } else {
            console.error('\n❌ TESTE FALHOU!');
            console.error('O token inválido 2 não foi removido ou o token válido 1 foi incorretamente removido.');
        }

        // 5. Limpa o usuário do banco
        await User.deleteOne({ clerkId: clerkIdTeste });
        console.log('Usuário de teste removido.');

    } catch (error) {
        console.error('Erro durante a execução do teste:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Desconectado do MongoDB.');
    }
}

runTest();
