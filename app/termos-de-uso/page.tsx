'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function TermosDeUsoPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-100 rounded-2xl p-6 sm:p-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-6 mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Termos de Uso</h1>
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
                        Seja bem-vindo ao <strong>MimoChat</strong>. Este documento rege os termos e conditions de uso de nossa plataforma, disponibilizada pela empresa <strong>LEAD CONTEUDOS DIGITAIS LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>60.312.273/0001-01</strong>, com nome de fantasia <strong>EEL CONTEUDOS DIGITAIS</strong>.
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">1. Aceitação dos Termos</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Ao criar uma conta, fazer login, acessar ou utilizar a plataforma MimoChat, você declara possuir capacidade civil plena e concorda expressamente e sem reservas com todas as cláusulas e condições previstas nestes Termos de Uso e em nossa Política de Privacidade. Caso não concorde com qualquer disposição aqui contida, você não deve acessar ou utilizar nossos serviços.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">2. Restrição de Idade e Declaração de Maioridade</h2>
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <p className="text-sm sm:text-base font-semibold text-purple-900">
                                IMPORTANTE: O MimoChat é estritamente proibido para menores de 18 (dezoito) anos de idade.
                            </p>
                            <p className="text-xs sm:text-sm text-purple-700 mt-2">
                                Ao prosseguir no cadastro ou login, o usuário declara e atesta, sob as penas da lei (incluindo as sanções penais por falsidade ideológica dispostas no Art. 299 do Código Penal Brasileiro), ter mais de 18 anos completos. A plataforma reserva-se o direito de exigir a comprovação documental da idade a qualquer tempo e banir de forma imediata e definitiva contas com suspeita de falsidade de idade.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">3. Enquadramento e Natureza do Serviço</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            O MimoChat é uma plataforma tecnológica de rede social baseada em mensagens assíncronas e hospedagem de conteúdo digital. Nossa atividade consiste na intermediação da comunicação digital e na facilitação técnica de envio de interações ("mimos") ou assinaturas de galerias privadas criadas e geradas de forma autônoma pelos Criadores de Conteúdo (Profissionais) aos seus Usuários (Clientes).
                        </p>
                        <p className="text-sm sm:text-base leading-relaxed font-medium text-gray-800">
                            A plataforma atua unicamente como provedor de hospedagem de aplicações de internet nos termos do Artigo 19 da Lei nº 12.965/2014 (Marco Civil da Internet), não exercendo controle editorial prévio, curadoria ou ingerência no conteúdo trocado em canais de chat privado.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">4. Expressa Proibição de Serviços Físicos/Presenciais</h2>
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-red-950">
                            <p className="text-sm sm:text-base font-semibold">
                                É EXPRESSAMENTE PROIBIDO utilizar a plataforma MimoChat para:
                            </p>
                            <ul className="list-disc list-inside text-xs sm:text-sm space-y-1 mt-2 text-red-900">
                                <li>Oferecer, agenciar, promover, comercializar ou facilitar a prestação de serviços sexuais presenciais, físicos ou de acompanhantes;</li>
                                <li>Facilitar ou intermediar a prostituição ou qualquer prática ilegal no território nacional;</li>
                                <li>Realizar encontros físicos remunerados ou atos obscenos em locais públicos.</li>
                            </ul>
                            <p className="text-xs sm:text-sm mt-3">
                                O MimoChat destina-se única e exclusivamente ao entretenimento virtual assíncrono e transmissão de mídias digitais. O descumprimento desta regra ensejará o banimento sumário da conta e eventual denúncia às autoridades competentes.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">5. Regras de Conduta dos Usuários</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            É terminantemente proibido publicar, transmitir ou compartilhar na plataforma qualquer conteúdo que contenha:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                            <li>Material pornográfico nas galerias públicas, fotos de capa ou fotos de perfil;</li>
                            <li>Material envolvendo pornografia infanto-juvenil, abusos, violência ou qualquer representação ilegal envolvendo menores;</li>
                            <li>Imagens ou dados de terceiros sem autorização expressa (pornografia de vingança ou não consensual);</li>
                            <li>Práticas de ódio, assédio, ameaças, racismo, homofobia ou injúria.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">6. Transações Financeiras e Repasses</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            A plataforma utiliza gateways de pagamentos terceirizados (incluindo <strong>Asaas</strong> e <strong>Abacate Pay</strong>) para o processamento de Pix e cartões de crédito. 
                        </p>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Os pagamentos enviados na forma de "mimos" (créditos virtuais voluntários) caracterizam-se legalmente como doações por liberalidade dos Usuários aos Criadores, não constituindo obrigação de contraprestação específica de serviços físicos e sendo, portanto, <strong>não reembolsáveis</strong>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-purple-500 pl-3">7. Disposições Finais</h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Estes termos são regidos pelas leis vigentes na República Federativa do Brasil. Fica eleito o Foro da Comarca de domicílio da sede da LEAD CONTEUDOS DIGITAIS LTDA para dirimir quaisquer controvérsias decorrentes deste instrumento.
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
