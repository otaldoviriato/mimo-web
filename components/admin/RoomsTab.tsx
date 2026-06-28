'use client';

import React, { useEffect } from 'react';
import { Eye, Coins, ShieldAlert, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRooms } from '@/hooks/admin/useRooms';

function getInitials(name: string) {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export function RoomsTab() {
    const {
        chats, loadingChats,
        selectedAuditChat, setSelectedAuditChat,
        auditLoadingMore,
        isFirstAuditLoad, setIsFirstAuditLoad,
        auditContainerRef,
        fetchRooms,
        handleOpenAuditModal,
        handleAuditScroll,
    } = useRooms();

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (selectedAuditChat && selectedAuditChat.history.length > 0 && isFirstAuditLoad && auditContainerRef.current) {
            auditContainerRef.current.scrollTop = auditContainerRef.current.scrollHeight;
            setIsFirstAuditLoad(false);
        }
    }, [selectedAuditChat, isFirstAuditLoad]);

    return (
        <>
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                        Auditoria de Conversas Diretas (1-para-1)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Visualize as trocas de mensagens entre usuários para moderação e auditoria de faturamento.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">Participantes</th>
                                <th className="py-4 px-6">Total Mensagens</th>
                                <th className="py-4 px-6">Faturamento da Conversa</th>
                                <th className="py-4 px-6">Última Mensagem</th>
                                <th className="py-4 px-6">Último Contato</th>
                                <th className="py-4 px-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingChats ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                            <span>Buscando conversas reais no banco...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : chats.length > 0 ? (
                                chats.map((chat) => (
                                    <tr key={chat.id} className="hover:bg-slate-50/40 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 border-2 border-white flex items-center justify-center font-bold text-xs">
                                                        {getInitials(chat.userA.name)}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 border-2 border-white flex items-center justify-center font-bold text-xs">
                                                        {getInitials(chat.userB.name)}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 leading-tight">{chat.userA.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5">↔ {chat.userB.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-600 font-medium">{chat.messagesCount}</td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                <Coins size={13} className="text-amber-500" />
                                                {chat.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-500 font-medium max-w-xs truncate">{chat.lastMessage}</td>
                                        <td className="py-4 px-6 text-xs text-slate-500 font-semibold">{chat.time}</td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleOpenAuditModal(chat)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-bold rounded-lg transition-all border border-purple-100 cursor-pointer group-hover:scale-105"
                                            >
                                                <Eye size={12} />
                                                Auditar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                        Nenhuma conversa encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de auditoria */}
            {selectedAuditChat && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl border border-purple-500/20">
                                    <ShieldAlert size={22} />
                                </div>
                                <div>
                                    <h3 className="text-white text-base font-bold tracking-tight">Auditoria de Conversa</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">
                                        Histórico completo de <strong>{selectedAuditChat.userA.name}</strong> para <strong>{selectedAuditChat.userB.name}</strong>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAuditChat(null)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div ref={auditContainerRef} onScroll={handleAuditScroll} className="flex-1 p-6 overflow-y-auto bg-slate-950/40 space-y-4">
                            {auditLoadingMore && (
                                <div className="text-center text-xs text-slate-500 py-2">Carregando mensagens anteriores...</div>
                            )}
                            {selectedAuditChat.history.map((msg, idx) => {
                                const isUserA = msg.sender === selectedAuditChat.userA.clerkId;
                                return (
                                    <div key={idx} className={`flex flex-col max-w-[80%] ${isUserA ? 'self-start mr-auto' : 'self-end ml-auto items-end'}`}>
                                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${isUserA ? 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800' : 'bg-purple-950/80 text-purple-100 rounded-tr-none border border-purple-900/60'}`}>
                                            <p>{msg.text}</p>
                                            {msg.cost > 0 && (
                                                <span className="inline-flex items-center gap-0.5 mt-2 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                                                    Custo: R$ {msg.cost.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-semibold mt-1 px-1">
                                            {isUserA ? selectedAuditChat.userA.name : selectedAuditChat.userB.name} • {msg.time}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-amber-500 font-bold bg-amber-500/5 px-3 py-1.5 rounded-xl border border-amber-500/10">
                                <AlertTriangle size={14} />
                                Apenas para moderação.
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => { toast.success('Usuário advertido com sucesso! (Simulado)'); setSelectedAuditChat(null); }}
                                    className="flex-1 sm:flex-initial px-4 py-2 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer bg-slate-900"
                                >
                                    Advertir Remetente
                                </button>
                                <button
                                    onClick={() => { toast.success('Conversa suspensa de forma temporária! (Simulado)'); setSelectedAuditChat(null); }}
                                    className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/10 transition-all cursor-pointer"
                                >
                                    Bloquear Conversa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
