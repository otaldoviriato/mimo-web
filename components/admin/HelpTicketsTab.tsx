'use client';

import React, { useEffect } from 'react';
import { Search, Star, Loader2, LifeBuoy, MailOpen, Trash2, Send } from 'lucide-react';
import { useHelpTickets } from '@/hooks/admin/useHelpTickets';
import { RichTextEditor } from './RichTextEditor';

function getInitials(name: string) {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

const STATUS_COLORS: Record<string, string> = {
    novo: 'bg-purple-50 text-purple-700 border-purple-100',
    em_atendimento: 'bg-blue-50 text-blue-700 border-blue-100',
    lido: 'bg-slate-50 text-slate-600 border-slate-100',
    resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    arquivado: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function HelpTicketsTab() {
    const {
        helpTickets, loadingTickets,
        selectedTicket, setSelectedTicket,
        ticketSearch, setTicketSearch,
        ticketStatusFilter, setTicketStatusFilter,
        ticketFavoriteFilter, setTicketFavoriteFilter,
        replyText, setReplyText,
        sendingReply,
        ticketNotes, setTicketNotes,
        savingNotes,
        fetchHelpTickets,
        handleUpdateTicketStatus,
        handleToggleFavorite,
        handleToggleRead,
        handleSaveTicketNotes,
        handleSendReply,
        handleDeleteTicket,
    } = useHelpTickets();

    useEffect(() => {
        fetchHelpTickets();
    }, []);

    const filtered = helpTickets.filter(t => {
        const q = ticketSearch.toLowerCase();
        const matchesSearch = !q ||
            t.senderEmail.toLowerCase().includes(q) ||
            (t.senderName?.toLowerCase().includes(q)) ||
            t.subject.toLowerCase().includes(q) ||
            t.message.toLowerCase().includes(q);
        const matchesStatus = ticketStatusFilter === 'all' ? true :
            ticketStatusFilter === 'abertos' ? ['novo', 'em_atendimento'].includes(t.status) :
            t.status === ticketStatusFilter;
        const matchesFav = !ticketFavoriteFilter || t.isFavorite;
        return matchesSearch && matchesStatus && matchesFav;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-190px)] animate-fade-in-up">
            {/* LISTA DE TICKETS */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
                <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                            <input type="text" placeholder="Pesquisar tickets..." value={ticketSearch} onChange={(e) => setTicketSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400 transition-all" />
                        </div>
                        <button
                            onClick={() => setTicketFavoriteFilter(!ticketFavoriteFilter)}
                            className={`p-2 border rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${ticketFavoriteFilter ? 'bg-amber-50 border-amber-200 text-amber-500 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
                        >
                            <Star size={14} className={ticketFavoriteFilter ? 'fill-amber-400' : ''} />
                        </button>
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
                        {[
                            { id: 'abertos', label: 'Abertos' },
                            { id: 'all', label: 'Todos' },
                            { id: 'novo', label: 'Novos' },
                            { id: 'em_atendimento', label: 'Em Fila' },
                            { id: 'resolvido', label: 'Resolvidos' },
                            { id: 'arquivado', label: 'Arquivados' },
                        ].map((pill) => (
                            <button key={pill.id} onClick={() => setTicketStatusFilter(pill.id)} className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer ${ticketStatusFilter === pill.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-50 border border-slate-150 text-slate-500 hover:bg-slate-100 hover:text-slate-750'}`}>
                                {pill.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50/20">
                    {loadingTickets ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-7 w-7 text-purple-600 animate-spin" />
                            <span className="text-xs font-semibold text-slate-400">Buscando tickets de ajuda...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-xs font-semibold text-slate-400">Nenhum ticket de ajuda encontrado.</div>
                    ) : (
                        <div>
                            {filtered.map((ticket) => {
                                const initials = getInitials(ticket.senderName || ticket.senderEmail);
                                const isSelected = selectedTicket?._id === ticket._id;
                                return (
                                    <div
                                        key={ticket._id}
                                        onClick={() => {
                                            setSelectedTicket(ticket);
                                            setTicketNotes(ticket.notes || '');
                                            setReplyText('');
                                            if (!ticket.isRead) handleToggleRead(ticket);
                                        }}
                                        className={`p-4 flex gap-3 cursor-pointer transition-all border-l-3 ${isSelected ? 'bg-purple-50/30 border-purple-600 shadow-xs' : 'hover:bg-slate-50/50 border-transparent bg-white'}`}
                                    >
                                        <div className="relative shrink-0 select-none">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs text-purple-700 border border-purple-100 ${isSelected ? 'bg-purple-100' : 'bg-purple-50/70'}`}>
                                                {initials}
                                            </div>
                                            {!ticket.isRead && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold tracking-tight">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                                                {ticket.isFavorite && <Star size={11} className="fill-amber-400 text-amber-500 shrink-0" />}
                                            </div>
                                            <h4 className={`text-xs truncate ${!ticket.isRead ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>{ticket.subject}</h4>
                                            <p className="text-[10px] text-slate-500 truncate leading-relaxed">
                                                {ticket.senderName ? `${ticket.senderName} · ` : ''}{ticket.senderEmail}
                                            </p>
                                            <div className="pt-1.5 flex items-center justify-between">
                                                <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${STATUS_COLORS[ticket.status] || STATUS_COLORS.novo}`}>
                                                    {ticket.status === 'novo' ? 'Novo' :
                                                     ticket.status === 'em_atendimento' ? 'Fila' :
                                                     ticket.status === 'resolvido' ? 'Resolvido' :
                                                     ticket.status === 'arquivado' ? 'Arquivado' : 'Lido'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* DETALHES E RESPOSTA */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
                {selectedTicket ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-slate-50/50">
                            <div className="space-y-1">
                                <h3 className="text-slate-800 text-sm font-extrabold leading-tight">{selectedTicket.subject}</h3>
                                <p className="text-[11px] text-slate-500 font-semibold leading-none">
                                    De: <strong className="text-slate-700">{selectedTicket.senderName || 'Não informado'}</strong> ({selectedTicket.senderEmail})
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    Aberto em: {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={() => handleToggleFavorite(selectedTicket)} className={`p-2 rounded-xl border transition-all cursor-pointer ${selectedTicket.isFavorite ? 'bg-amber-50 border-amber-250 text-amber-500' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`} title={selectedTicket.isFavorite ? 'Remover dos favoritos' : 'Marcar como favorito'}>
                                    <Star size={14} className={selectedTicket.isFavorite ? 'fill-amber-400' : ''} />
                                </button>
                                <button onClick={() => handleToggleRead(selectedTicket)} className={`p-2 rounded-xl border transition-all cursor-pointer ${selectedTicket.isRead ? 'bg-slate-50 border-slate-250 text-slate-500 hover:text-slate-700' : 'bg-purple-50 border-purple-250 text-purple-600 hover:text-purple-700'}`} title={selectedTicket.isRead ? 'Marcar como não lido' : 'Marcar como lido'}>
                                    <MailOpen size={14} />
                                </button>
                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1.5 rounded-xl text-xs font-semibold">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase select-none">Status:</span>
                                    <select value={selectedTicket.status} onChange={(e) => handleUpdateTicketStatus(selectedTicket._id, e.target.value)} className="bg-transparent focus:outline-none text-slate-700 font-bold cursor-pointer">
                                        <option value="novo">Novo</option>
                                        <option value="em_atendimento">Em Atendimento</option>
                                        <option value="resolvido">Resolvido</option>
                                        <option value="arquivado">Arquivado</option>
                                    </select>
                                </div>
                                <button onClick={() => handleDeleteTicket(selectedTicket._id)} className="p-2 bg-white border border-slate-250 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-all cursor-pointer" title="Excluir ticket permanentemente">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ backgroundImage: 'radial-gradient(#E9D5FF 1.5px, transparent 1.5px)', backgroundSize: '20px 20px', backgroundColor: '#fafafc' }}>
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Mensagem do Usuário</h4>
                                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-slate-700 text-xs sm:text-sm leading-relaxed font-medium shadow-xs max-h-[300px] overflow-y-auto [&_a]:text-purple-600 [&_a]:underline [&_a]:hover:text-purple-800 [&_a]:font-semibold" dangerouslySetInnerHTML={{ __html: selectedTicket.message }} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2 flex flex-col">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Anotações Internas (Administração)</h4>
                                    <textarea value={ticketNotes} onChange={(e) => setTicketNotes(e.target.value)} placeholder="Digite anotações ou observações para controle interno..." rows={4} className="w-full flex-1 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400 resize-none min-h-[120px]" />
                                    <button onClick={() => handleSaveTicketNotes(selectedTicket._id)} disabled={savingNotes} className="mt-2 w-fit px-4 py-2 bg-slate-800 hover:bg-slate-750 active:bg-slate-900 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer">
                                        {savingNotes ? 'Salvando...' : 'Salvar Anotações'}
                                    </button>
                                </div>

                                <div className="space-y-2 flex flex-col">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Responder ao Usuário (via E-mail)</h4>
                                    <RichTextEditor value={replyText} onChange={setReplyText} placeholder={`Escreva uma resposta direta para o e-mail: ${selectedTicket.senderEmail}...`} minHeight="120px" />
                                    <button onClick={() => handleSendReply(selectedTicket._id)} disabled={sendingReply || !replyText.trim()} className="mt-2 w-fit px-5 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/15 cursor-pointer flex items-center gap-1.5">
                                        {sendingReply ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Send size={12} />}
                                        Enviar Resposta
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 animate-fade-in">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350 mb-4 shadow-inner">
                            <LifeBuoy size={28} className="animate-spin" style={{ animationDuration: '6s' }} />
                        </div>
                        <h4 className="text-slate-800 text-sm font-bold">Nenhum Ticket Selecionado</h4>
                        <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed mt-1">
                            Selecione um ticket de ajuda na lista lateral para gerenciar os detalhes, salvar observações internas e responder diretamente via e-mail.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
