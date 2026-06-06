'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function PoliticaDePrivacidadePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-100 rounded-2xl p-6 sm:p-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-6 mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Política de Privacidade</h1>
                        <p className="text-sm text-gray-500 mt-1">Última atualização: 6 de junho de 2026</p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors shrink-0"
                    >
                        Voltar
                    </button>
                </div>

                {/* Content */}
                <div className="prose prose-purple max-w-none text-gray-600 space-y-6">
                    <p className="lead text-base sm:text-lg font-medium text-gray-700">
                        Esta Política de Privacidade explica de que forma a <strong>LEAD CONTEUDOS DIGITAIS LTDA</strong> (CNPJ <strong>60.312.273/0001-01</strong>, com nome de fantasia <strong>EEL CONTEUDOS DIGITAIS</strong>) coleta, armazena, utiliza e protege os dados pessoais de seus usuários no aplicativo <strong>MimoChat</strong>, em estrita conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/18)</strong> e o Marco Civil da Internet.
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">1. Dados Coletados</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Nós coletamos informações necessárias para a prestação de nossos serviços, divididas em:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-2 pl-2">
                            <li><strong>Informações Cadastrais:</strong> E-mail de cadastro, nome exibido, nome de usuário (@username) e número de telefone/WhatsApp;</li>
                            <li><strong>Dados de Identificação de Criadores (Profissionais):</strong> CPF/CNPJ, chave Pix para repasses, dados de identificação oficial com foto e selfie (usados exclusivamente para o processo interno de homologação e validação manual de maioridade);</li>
                            <li><strong>Dados de Faturamento e Cobrança:</strong> Não armazenamos em nossos servidores dados confidenciais de cartão de crédito. Essas informações são processadas de forma transparente e criptografada pelos gateways parceiros homologados (<strong>Asaas</strong> e <strong>Abacate Pay</strong>);</li>
                            <li><strong>Dados de Conexão e Navegação:</strong> Endereço IP, data e hora dos acessos à aplicação, tipo de navegador e identificação do dispositivo (em cumprimento ao Art. 15 do Marco Civil da Internet).</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">2. Finalidade do Tratamento de Dados</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Os dados pessoais coletados são utilizados para os seguintes propósitos:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-2 pl-2">
                            <li>Identificar e autenticar o acesso do usuário à plataforma com segurança através do parceiro <strong>Clerk</strong>;</li>
                            <li>Verificar a maioridade legal dos usuários cadastrados, prevenindo o acesso ou a prestação de serviços por menores de 18 anos;</li>
                            <li>Processar pagamentos de recargas, assinaturas e repasses aos Criadores de Conteúdo;</li>
                            <li>Cumprir obrigações legais, regulatórias ou fiscais aplicáveis à operação;</li>
                            <li>Enviar notificações PWA importantes sobre novos chats, interações recebidas ou atualizações do sistema (quando expressamente aceitas pelo usuário).</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">3. Compartilhamento de Dados com Terceiros</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            O MimoChat não comercializa dados pessoais sob nenhuma hipótese. Os dados pessoais podem ser compartilhados com terceiros prestadores de serviços de infraestrutura apenas no limite do estritamente necessário para manter o funcionamento da aplicação, incluindo:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-2 pl-2">
                            <li><strong>Clerk Inc:</strong> Provedor do sistema de login, segurança e gestão de sessões;</li>
                            <li><strong>Asaas Gestão Financeira S.A.:</strong> Gateway responsável pela intermediação e cobrança das transações via cartão de crédito e Pix;</li>
                            <li><strong>Abacate Pay:</strong> Sistema integrador de pagamentos via Pix;</li>
                            <li><strong>Autoridades Governamentais/Judiciais:</strong> Apenas mediante ordem judicial ou requerimento administrativo legal de autoridade policial/fiscal competente, nos termos previstos pelo Marco Civil da Internet.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">4. Direitos dos Titulares de Dados</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Em consonância com o Artigo 18 da LGPD, o usuário poderá, a qualquer momento, requerer:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-2 pl-2">
                            <li>Confirmação da existência do tratamento e acesso simplificado aos seus dados cadastrais;</li>
                            <li>Correção de dados incompletos, inexatos ou desatualizados nas configurações do seu perfil;</li>
                            <li>Bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
                            <li><strong>Eliminação definitiva dos dados pessoais (Exclusão da Conta):</strong> O usuário pode solicitar a exclusão de seus dados. Observa-se que, por exigência do Marco Civil da Internet, dados relativos a logs de acesso (como IPs e registros de conexões) deverão ser mantidos sob sigilo pelo prazo obrigatório de 6 (seis) meses antes da exclusão total.</li>
                        </ul>
                        <p className="text-sm sm:text-base leading-relaxed">
                            As solicitações de exclusão de conta ou informações sobre a proteção de dados devem ser enviadas diretamente para o e-mail de suporte: <span className="font-semibold text-purple-600">suporte@mimochat.com.br</span>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">5. Segurança da Informação</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Adotamos medidas técnicas de segurança da informação (como criptografia de tráfego via protocolo HTTPS/TLS, firewalls e controle rigoroso de acesso às bases de dados) para evitar a perda, uso indevido, alteração ou vazamento acidental dos dados de nossos usuários.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">6. Cookies e Tecnologias de Rastreamento</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Utilizamos cookies estritamente necessários para permitir a navegação e autenticação segura do usuário no MimoChat. Cookies de terceiros podem ser utilizados para controle de segurança de pagamento e gerenciamento de sessões de login (Clerk).
                        </p>
                    </section>
                </div>

                {/* Footer Corporativo */}
                <div className="border-t border-gray-100 mt-12 pt-6 text-center text-xs text-gray-400">
                    <p className="font-semibold text-gray-500">LEAD CONTEUDOS DIGITAIS LTDA</p>
                    <p className="mt-1">CNPJ: 60.312.273/0001-01</p>
                    <p>EEL CONTEUDOS DIGITAIS</p>
                    <p className="mt-2 text-purple-400">suporte@mimochat.com.br</p>
                </div>
            </div>
        </div>
    );
}
