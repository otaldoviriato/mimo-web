import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente manualmente do .env de mimo-web
function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ Arquivo .env não encontrado em mimo-web!');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};

    envContent.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] ? match[2].trim() : '';
            // Remover aspas se houver
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            env[match[1]] = value;
        }
    });

    return env;
}

async function main() {
    const env = loadEnv();
    let apiKey = env.ASAAS_API_KEY;

    if (!apiKey) {
        console.error('❌ Variável ASAAS_API_KEY não configurada no .env!');
        process.exit(1);
    }

    // Limpar barra invertida inicial do escape
    if (apiKey.startsWith('\\$')) {
        apiKey = apiKey.substring(1);
    }

    // Pegar argumentos da linha de comando se houver
    const args = process.argv.slice(2);
    const document = args[0] || '60312273000101'; // CNPJ padrão da Lead ou CPF fornecido
    const isCpf = document.length === 11;
    const name = args[1] || (isCpf ? 'Viriato Teste Onboarding' : 'LEAD Teste Onboarding');
    const email = args[2] || `suporte+subtest${Date.now()}@mimochat.com.br`;
    const birthDate = args[3];

    console.log('🔄 Iniciando criação de subconta de teste no Asaas...');
    console.log(`📍 Documento: ${document} (${isCpf ? 'CPF' : 'CNPJ'})`);
    console.log(`📍 Nome: ${name}`);
    console.log(`📍 E-mail: ${email}`);
    if (isCpf) console.log(`📍 Data de Nascimento: ${birthDate}`);

    const payload = {
        name: name,
        email: email,
        cpfCnpj: document,
        companyType: isCpf ? undefined : 'LIMITED',
        personType: isCpf ? 'FISICA' : 'JURIDICA',
        birthDate: isCpf ? birthDate : undefined,
        phone: '1132300606',
        mobilePhone: '11988' + Math.floor(100000 + Math.random() * 900000),
        address: 'Av. Rolf Wiest',
        addressNumber: '277',
        complement: 'Sala 502',
        province: 'Bom Retiro',
        postalCode: '89223005',
        incomeValue: 5000
    };

    try {
        const response = await fetch('https://api.asaas.com/v3/accounts', {
            method: 'POST',
            headers: {
                'access_token': apiKey,
                'content-type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Falha ao criar subconta no Asaas:', response.status);
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
        }

        console.log('==================================================');
        console.log('✅ SUBCONTA CRIADA COM SUCESSO!');
        console.log('==================================================');
        console.log(`🔑 API Key da Subconta: ${data.apiKey}`);
        console.log(`💼 Wallet ID da Subconta: ${data.walletId}`);
        console.log(`📂 ID da Subconta: ${data.id}`);
        console.log('==================================================');
        console.log('🎉 O gatilho de BaaS foi disparado no Asaas de produção!');
        console.log('Agora você já pode informar ao suporte do WhatsApp e aguardar o e-mail da Emma com o contrato regulatório.');
    } catch (error) {
        console.error('❌ Erro de conexão com a API do Asaas:', error);
        process.exit(1);
    }
}

main();
