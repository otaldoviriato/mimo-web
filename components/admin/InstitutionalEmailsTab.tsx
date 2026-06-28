'use client';

import React, { useEffect } from 'react';
import {
    Mail, Sliders, ArrowLeft, ArrowRight, Plus, Settings, Search,
    Loader2, Send, X, Star, MailOpen, Trash2, MailPlus, Check
} from 'lucide-react';
import { useInstitutionalEmails } from '@/hooks/admin/useInstitutionalEmails';
import { RichTextEditor } from './RichTextEditor';

function getInitials(name: string) {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export function InstitutionalEmailsTab() {
    const hook = useInstitutionalEmails();
    const {
        institutionalEmails, emailRedirections,
        loadingInstitutional,
        instMessages,
        selectedInstMessage, setSelectedInstMessage,
        instSearch, setInstSearch,
        instStatusFilter, setInstStatusFilter,
        selectedInstEmail, setSelectedInstEmail,
        showInstConfigModal, setShowInstConfigModal,
        showNewEmailModal, setShowNewEmailModal,
        replyInstText, setReplyInstText,
        sendingInstReply,
        instNotes, setInstNotes,
        savingInstNotes,
        showInstReplyBox, setShowInstReplyBox,
        newInstEmailPrefix, setNewInstEmailPrefix,
        newInstEmailForwarding, setNewInstEmailForwarding,
        newInstEmailDisplayName, setNewInstEmailDisplayName,
        addingInstEmail,
        newEmailTo, setNewEmailTo,
        newEmailSubject, setNewEmailSubject,
        newEmailMessage, setNewEmailMessage,
        sendingNewEmail,
        fetchInstitutionalData,
        handleAddInstitutionalEmail,
        handleDeleteInstitutionalEmail,
        handleSendInstReply,
        handleSaveInstNotes,
        handleToggleInstFavorite,
        handleToggleInstRead,
        handleUpdateInstStatus,
        handleDeleteInstMessage,
        handleSendNewEmail,
    } = hook;

    useEffect(() => {
        fetchInstitutionalData({ email: selectedInstEmail, search: instSearch, statusFilter: instStatusFilter });
    }, [selectedInstEmail, instSearch, instStatusFilter]);

    return (
        <>
            {/* Vista sem conta selecionada */}
            {selectedInstEmail === null && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div>
                            <h3 className="text-slate-800 text-base font-extrabold tracking-tight">Gerenciamento de E-mails Institucionais</h3>
                            <p className="text-slate-500 text-xs mt-0.5">Selecione uma conta ativa abaixo para visualizar mensagens ou gerencie os redirecionamentos.</p>
                        </div>
                        <button onClick={() => { setNewInstEmailPrefix(''); setNewInstEmailDisplayName(''); setNewInstEmailForwarding(''); setShowInstConfigModal(true); }} className="px-4 py-2.5 bg-purple-600 hover:bg-purple-750 active:bg-purple-850 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/15 cursor-pointer flex items-center gap-1.5">
                            <Sliders size={13} />
                            Configurar Roteamentos De-Para
                        </button>
                    </div>

                    {loadingInstitutional ? (
                        <div className="py-20 bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-xs min-h-[300px]">
                            <span className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                            <span className="text-xs font-semibold text-slate-400">Carregando contas...</span>
                        </div>
                    ) : institutionalEmails.length === 0 ? (
                        <div className="py-20 bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400 shadow-xs min-h-[300px]">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-4 shadow-inner">
                                <Mail size={28} className="text-slate-300" />
                            </div>
                            <h4 className="text-slate-800 text-sm font-bold">Nenhuma Conta Configurada</h4>
                            <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed mt-1 mb-4">Comece configurando seu primeiro e-mail institucional corporativo.</p>
                            <button onClick={() => setShowInstConfigModal(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-md">Configurar Primeiro E-mail</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {institutionalEmails.map((email) => {
                                const redir = emailRedirections.find(r => r.sourceEmail.toLowerCase() === email.toLowerCase());
                                return (
                                    <div key={email} onClick={() => { setSelectedInstEmail(email); setSelectedInstMessage(null); }} className="bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:bg-purple-500/10 transition-colors" />
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-purple-50 text-purple-650 rounded-xl group-hover:bg-purple-100 transition-colors"><Mail size={18} /></div>
                                                <div className="min-w-0">
                                                    <h4 className="text-slate-800 font-extrabold text-sm truncate">{redir?.displayName || 'Sem Nome'}</h4>
                                                    <p className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">Conta Institucional</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 pt-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">E-mail Oficial</span>
                                                    <span className="text-slate-700 font-bold text-xs truncate">{email}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Redireciona Para</span>
                                                    <span className="text-purple-650 font-bold text-xs truncate">{redir?.targetEmail || 'Não Configurado'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-450 group-hover:text-purple-600 transition-colors">
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Acessar Caixa de Entrada</span>
                                            <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Vista com conta selecionada */}
            {selectedInstEmail !== null && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setSelectedInstEmail(null); setSelectedInstMessage(null); }} className="p-2 border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100/50 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0" title="Voltar">
                                <ArrowLeft size={14} />
                            </button>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-slate-800 text-sm font-extrabold truncate">
                                        {emailRedirections.find(r => r.sourceEmail.toLowerCase() === selectedInstEmail.toLowerCase())?.displayName || 'Sem Nome'}
                                    </h3>
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-650 text-[9px] font-bold rounded-md border border-purple-100 select-none shrink-0">Ativo</span>
                                </div>
                                <p className="text-slate-455 text-[10px] font-bold truncate mt-0.5">{selectedInstEmail}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setNewEmailTo(''); setNewEmailSubject(''); setNewEmailMessage(''); setShowNewEmailModal(true); }} className="px-3.5 py-2 bg-purple-600 hover:bg-purple-750 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/15 cursor-pointer flex items-center gap-1.5">
                                <Plus size={13} /> Iniciar Nova Conversa
                            </button>
                            <button onClick={() => setShowInstConfigModal(true)} className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0" title="Editar Configurações De-Para">
                                <Settings size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
                        {/* Lista de mensagens */}
                        <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
                            <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                    <input type="text" placeholder="Pesquisar e-mails..." value={instSearch} onChange={(e) => setInstSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400 transition-all" />
                                </div>
                                <div className="flex gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
                                    {[{ id: 'all', label: 'Todos' }, { id: 'recebido', label: 'Recebidos' }, { id: 'enviado', label: 'Enviados' }, { id: 'lido', label: 'Lidos' }].map((pill) => (
                                        <button key={pill.id} onClick={() => setInstStatusFilter(pill.id)} className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer ${instStatusFilter === pill.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-50 border border-slate-150 text-slate-500 hover:bg-slate-100 hover:text-slate-750'}`}>
                                            {pill.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50/20">
                                {loadingInstitutional ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-7 w-7 text-purple-600 animate-spin" />
                                        <span className="text-xs font-semibold text-slate-400">Carregando mensagens...</span>
                                    </div>
                                ) : instMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-3 shadow-inner">
                                            <Mail size={22} className="text-slate-300" />
                                        </div>
                                        <h4 className="text-slate-800 text-xs font-bold">Nenhum E-mail Recebido</h4>
                                        <p className="text-[10px] text-slate-400 font-medium max-w-[200px] leading-relaxed mt-1">As mensagens recebidas por esta conta serão exibidas aqui.</p>
                                    </div>
                                ) : (
                                    <div className="p-0">
                                        {instMessages.filter(msg => {
                                            if (instStatusFilter === 'recebido') return !msg.isOutbox;
                                            if (instStatusFilter === 'enviado') return !!msg.isOutbox;
                                            return true;
                                        }).map((msg) => {
                                            const initials = getInitials(msg.senderName || msg.senderEmail);
                                            const isSelected = selectedInstMessage?._id === msg._id;
                                            return (
                                                <div key={msg._id} onClick={() => { setSelectedInstMessage(msg); setInstNotes(msg.notes || ''); setReplyInstText(''); setShowInstReplyBox(false); if (!msg.isRead) handleToggleInstRead(msg); }} className={`p-4 flex gap-3 cursor-pointer transition-all border-l-3 ${isSelected ? 'bg-purple-50/30 border-purple-600 shadow-xs' : 'hover:bg-slate-50/50 border-transparent bg-white'}`}>
                                                    <div className="relative shrink-0 select-none">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs text-purple-700 border border-purple-100 ${isSelected ? 'bg-purple-100' : 'bg-purple-50/70'}`}>{initials}</div>
                                                        {!msg.isRead && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[10px] text-slate-505 font-bold truncate max-w-[120px]">{msg.senderName || msg.senderEmail}</span>
                                                            <span className="text-[9px] text-slate-400 font-bold shrink-0">{new Date(msg.createdAt).toLocaleDateString('pt-BR')}</span>
                                                        </div>
                                                        <h4 className={`text-xs truncate ${!msg.isRead ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>{msg.subject}</h4>
                                                        <div className="pt-1 flex items-center justify-between">
                                                            {msg.isOutbox ? (
                                                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-md border bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1"><Send size={8} /> Enviado</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-md border bg-purple-50 text-purple-700 border-purple-100 flex items-center gap-1"><Mail size={8} /> Recebido</span>
                                                            )}
                                                            {msg.isFavorite && <Star size={11} className="fill-amber-400 text-amber-500 shrink-0" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detalhes da mensagem */}
                        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
                            {selectedInstMessage ? (
                                <div className="flex-1 flex flex-col h-full overflow-hidden">
                                    <div className="p-5 border-b border-slate-150 flex items-start justify-between bg-slate-50/20 shrink-0 gap-4">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-slate-800 text-sm font-extrabold leading-tight">{selectedInstMessage.subject}</h3>
                                            <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-slate-500 font-medium">
                                                <span>{selectedInstMessage.isOutbox ? 'Para:' : 'De:'}</span>
                                                <span className="font-bold text-slate-700">{selectedInstMessage.senderName ? `${selectedInstMessage.senderName} <${selectedInstMessage.senderEmail}>` : selectedInstMessage.senderEmail}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${selectedInstMessage.isOutbox ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                                    {selectedInstMessage.isOutbox ? 'Enviado' : 'Recebido'}
                                                </span>
                                                <span className="text-[9px] font-medium text-slate-400">{new Date(selectedInstMessage.createdAt).toLocaleString('pt-BR')}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 select-none shrink-0">
                                            <button onClick={() => handleToggleInstFavorite(selectedInstMessage)} className={`p-2 rounded-xl border transition-all cursor-pointer ${selectedInstMessage.isFavorite ? 'bg-amber-50 border-amber-200 text-amber-500' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`} title={selectedInstMessage.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}>
                                                <Star size={13} className={selectedInstMessage.isFavorite ? 'fill-amber-400' : ''} />
                                            </button>
                                            <button onClick={() => handleToggleInstRead(selectedInstMessage)} className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all cursor-pointer" title={selectedInstMessage.isRead ? 'Marcar como não lido' : 'Marcar como lido'}>
                                                <MailOpen size={13} />
                                            </button>
                                            <button onClick={() => handleDeleteInstMessage(selectedInstMessage._id)} className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all cursor-pointer" title="Excluir conversa">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                                        <div className="space-y-4">
                                            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs relative">
                                                <div className="flex justify-between items-start gap-4 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedInstMessage.isOutbox ? 'bg-blue-500' : 'bg-purple-600'}`} />
                                                        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${selectedInstMessage.isOutbox ? 'text-blue-650' : 'text-purple-650'}`}>
                                                            {selectedInstMessage.isOutbox ? 'E-mail Enviado' : 'E-mail Recebido'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-bold">{new Date(selectedInstMessage.createdAt).toLocaleString('pt-BR')}</span>
                                                </div>
                                                <div className="text-xs text-slate-700 leading-relaxed font-medium [&_a]:text-purple-600 [&_a]:underline [&_a]:hover:text-purple-800 [&_a]:font-semibold" dangerouslySetInnerHTML={{ __html: selectedInstMessage.message }} />
                                            </div>

                                            {selectedInstMessage.replies && selectedInstMessage.replies.length > 0 && (
                                                <div className="space-y-4 pt-2 relative before:absolute before:left-6 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
                                                    {selectedInstMessage.replies.map((reply: any, idx: number) => (
                                                        <div key={reply._id || idx} className={`ml-12 border rounded-2xl p-5 shadow-xs relative ${reply.isOutbox ? 'bg-emerald-50/20 border-emerald-100' : 'bg-purple-50/20 border-purple-100'}`}>
                                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${reply.isOutbox ? 'bg-emerald-500' : 'bg-purple-600'}`} />
                                                                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${reply.isOutbox ? 'text-emerald-650' : 'text-purple-650'}`}>
                                                                        {reply.isOutbox ? 'Resposta Enviada' : 'Resposta Recebida'}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-bold">{new Date(reply.createdAt).toLocaleString('pt-BR')}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-700 leading-relaxed font-medium [&_a]:text-purple-600 [&_a]:underline [&_a]:hover:text-purple-800 [&_a]:font-semibold" dangerouslySetInnerHTML={{ __html: reply.message }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 shrink-0">
                                        {!showInstReplyBox ? (
                                            <div className="px-4 py-3 bg-slate-50/40 flex items-center gap-2">
                                                <button onClick={() => setShowInstReplyBox(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5">
                                                    <Send size={11} /> Responder
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-slate-50/40">
                                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                                                            <span className="font-bold text-slate-400 uppercase tracking-wider">Para:</span>
                                                            <span className="font-bold text-slate-700">{selectedInstMessage.senderEmail}</span>
                                                        </div>
                                                        <button onClick={() => { setShowInstReplyBox(false); setReplyInstText(''); }} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer" title="Fechar">
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                    <div className="p-1">
                                                        <RichTextEditor value={replyInstText} onChange={setReplyInstText} placeholder="Escreva sua resposta aqui..." minHeight="90px" />
                                                    </div>
                                                    <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
                                                        <button onClick={() => handleSendInstReply(selectedInstMessage._id)} disabled={sendingInstReply || !replyInstText.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5">
                                                            {sendingInstReply ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={11} />}
                                                            Enviar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-3 shadow-inner">
                                        <MailOpen size={24} className="text-slate-300 animate-pulse" />
                                    </div>
                                    <h4 className="text-slate-800 text-xs font-bold">Nenhum E-mail Selecionado</h4>
                                    <p className="text-[10px] text-slate-450 font-medium max-w-[200px] leading-relaxed mt-1">Selecione uma mensagem na caixa de entrada lateral para visualizar o conteúdo e responder.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Configurar roteamentos De-Para */}
            {showInstConfigModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50/20 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-50 text-purple-650 rounded-2xl border border-purple-100"><Sliders size={20} /></div>
                                <div>
                                    <h3 className="text-slate-800 text-base font-extrabold tracking-tight">Configurar Redirecionamentos De-Para</h3>
                                    <p className="text-slate-455 text-xs mt-0.5">Associe contas institucionais oficiais a e-mails privados para encaminhamento automático.</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowInstConfigModal(false); fetchInstitutionalData(); }} className="p-2 hover:bg-slate-100 text-slate-455 hover:text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                            <div className="lg:col-span-5 bg-slate-50/50 border border-slate-150 rounded-2xl p-5 h-fit space-y-4">
                                <div>
                                    <h4 className="text-slate-800 font-extrabold text-xs">Vincular Nova Conta</h4>
                                    <p className="text-slate-400 text-[9px] font-bold uppercase mt-0.5 tracking-wider">Configure um novo de-para</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Prefixo do E-mail</span>
                                        <div className="relative flex items-center select-none">
                                            <input type="text" value={newInstEmailPrefix} onChange={(e) => setNewInstEmailPrefix(e.target.value)} placeholder="ex: contato" className="w-full text-right pr-2 pl-3 py-2.5 text-xs bg-white border border-slate-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700 placeholder-slate-400 transition-all" />
                                            <span className="bg-slate-100 border-y border-r border-slate-200 text-slate-500 px-3 py-2.5 text-xs font-bold rounded-r-xl">@mimochat.com.br</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Nome de Exibição (Remetente)</span>
                                        <input type="text" value={newInstEmailDisplayName} onChange={(e) => setNewInstEmailDisplayName(e.target.value)} placeholder="ex: Suporte MimoChat" className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-700 placeholder-slate-400 transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Redirecionar para (Privado)</span>
                                        <input type="email" value={newInstEmailForwarding} onChange={(e) => setNewInstEmailForwarding(e.target.value)} placeholder="ex: pessoal@gmail.com" className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-700 placeholder-slate-400 transition-all" />
                                    </div>
                                </div>
                                <button onClick={handleAddInstitutionalEmail} disabled={addingInstEmail || !newInstEmailPrefix.trim() || !newInstEmailDisplayName.trim() || !newInstEmailForwarding.trim()} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/10">
                                    {addingInstEmail ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Check size={13} />}
                                    Salvar Roteamento
                                </button>
                            </div>

                            <div className="lg:col-span-7 flex flex-col min-h-0 bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/20">
                                    <h4 className="text-slate-800 font-extrabold text-xs">Contas Ativas</h4>
                                    <p className="text-slate-450 text-[9px] font-bold uppercase mt-0.5 tracking-wider">Lista de e-mails mapeados no sistema</p>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {institutionalEmails.length === 0 ? (
                                        <div className="py-20 text-center text-xs font-semibold text-slate-450">Nenhum roteamento cadastrado.</div>
                                    ) : (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-150 text-[9px] font-bold text-slate-450 uppercase tracking-widest select-none">
                                                    <th className="p-3 pl-4">E-mail Oficial / Nome</th>
                                                    <th className="p-3">Redirecionamento</th>
                                                    <th className="p-3 text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs">
                                                {institutionalEmails.map((email) => {
                                                    const redir = emailRedirections.find(r => r.sourceEmail.toLowerCase() === email.toLowerCase());
                                                    return (
                                                        <tr key={email} className="hover:bg-slate-50/30 transition-colors">
                                                            <td className="p-3 pl-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-extrabold text-slate-800 text-xs">{email}</span>
                                                                    <span className="text-[10px] text-slate-455 font-medium">{redir?.displayName || 'Não configurado'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-3 font-bold text-purple-650">{redir?.targetEmail || 'Não configurado'}</td>
                                                            <td className="p-3 text-center">
                                                                <div className="flex justify-center gap-1.5">
                                                                    <button onClick={() => { const prefix = email.split('@')[0]; setNewInstEmailPrefix(prefix); setNewInstEmailDisplayName(redir?.displayName || ''); setNewInstEmailForwarding(redir?.targetEmail || ''); }} className="p-2 border border-slate-200 hover:border-purple-200 text-slate-400 hover:text-purple-600 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0" title="Editar roteamento">
                                                                        <Sliders size={12} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteInstitutionalEmail(email)} className="p-2 border border-slate-200 hover:border-rose-150 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0" title="Excluir roteamento">
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Novo e-mail */}
            {showNewEmailModal && selectedInstEmail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 text-purple-650 rounded-xl border border-purple-100"><MailPlus size={18} /></div>
                                <div>
                                    <h3 className="text-slate-800 text-sm font-extrabold tracking-tight font-sans">Iniciar Nova Conversa</h3>
                                    <p className="text-slate-450 text-[10px] font-bold mt-0.5">Envia um e-mail do zero usando seu remetente institucional oficial.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowNewEmailModal(false)} className="p-2 hover:bg-slate-100 text-slate-455 hover:text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Remetente (De)</span>
                                <input type="text" value={selectedInstEmail} disabled className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-500 cursor-not-allowed select-none" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Destinatário (Para)</span>
                                <input type="email" value={newEmailTo} onChange={(e) => setNewEmailTo(e.target.value)} placeholder="ex: usuario-destino@gmail.com" className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-700 placeholder-slate-400 transition-all" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Assunto</span>
                                <input type="text" value={newEmailSubject} onChange={(e) => setNewEmailSubject(e.target.value)} placeholder="Informe o assunto do e-mail..." className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-700 placeholder-slate-400 transition-all" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest block">Mensagem</span>
                                <RichTextEditor value={newEmailMessage} onChange={setNewEmailMessage} placeholder="Escreva sua mensagem aqui..." minHeight="140px" />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50/50 border-t border-slate-150 flex justify-end gap-2 shrink-0">
                            <button onClick={() => setShowNewEmailModal(false)} className="px-4 py-2 hover:bg-slate-150/60 border border-slate-200 text-slate-500 hover:text-slate-800 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer">Cancelar</button>
                            <button onClick={async () => { await handleSendNewEmail(); setShowNewEmailModal(false); fetchInstitutionalData({ email: selectedInstEmail }); }} disabled={sendingNewEmail || !newEmailTo.trim() || !newEmailSubject.trim() || !newEmailMessage.trim()} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-extrabold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5">
                                {sendingNewEmail ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Send size={11} />}
                                Enviar E-mail
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
