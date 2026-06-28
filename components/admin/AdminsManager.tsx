'use client';

import React from 'react';
import { Search, Loader2, Trash2, UserCheck } from 'lucide-react';
import type { RichAdmin } from '@/types/admin';

interface AdminsManagerProps {
    adminListRich: RichAdmin[];
    adminSearch: string;
    adminSearchResults: RichAdmin[];
    showAdminDropdown: boolean;
    searchingAdmin: boolean;
    userId: string | null | undefined;
    onAdminSearch: (q: string) => void;
    onDropdownClose: () => void;
    onSelectAdmin: (user: RichAdmin) => void;
    onRemoveAdmin: (clerkId: string) => void;
    getInitials: (name: string) => string;
}

export function AdminsManager({
    adminListRich,
    adminSearch,
    adminSearchResults,
    showAdminDropdown,
    searchingAdmin,
    userId,
    onAdminSearch,
    onDropdownClose,
    onSelectAdmin,
    onRemoveAdmin,
    getInitials,
}: AdminsManagerProps) {
    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6 flex flex-col h-fit relative">
            <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <UserCheck size={20} className="text-purple-600" />
                    Administradores
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                    Pesquise usuários pelo nome ou e-mail para promovê-los a administrador.
                </p>
            </div>

            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar usuário por nome/e-mail..."
                        value={adminSearch}
                        onChange={(e) => onAdminSearch(e.target.value)}
                        onFocus={() => { if (adminSearchResults.length > 0) onDropdownClose(); }}
                        className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400"
                    />
                    {searchingAdmin && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 animate-spin" size={14} />
                    )}
                </div>

                {showAdminDropdown && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={onDropdownClose} />
                        <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 divide-y divide-slate-50 animate-fade-in-up">
                            {adminSearchResults.length > 0 ? (
                                adminSearchResults.map((user) => (
                                    <button
                                        key={user.clerkId}
                                        type="button"
                                        onClick={() => onSelectAdmin(user)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-xs overflow-hidden">
                                            {user.photoUrl ? (
                                                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(user.name)
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-800 truncate">{user.name}</span>
                                            <span className="text-[10px] text-slate-400 font-semibold truncate">{user.email}</span>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-center text-xs font-semibold text-slate-400">
                                    Nenhum usuário encontrado.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto divide-y divide-slate-100 pr-1 mt-2">
                {adminListRich.map((admin) => (
                    <div key={admin.clerkId} className="flex items-center justify-between py-2.5 first:pt-0">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs border border-purple-100 overflow-hidden shrink-0">
                                {admin.photoUrl ? (
                                    <img src={admin.photoUrl} alt={admin.name} className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(admin.name)
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-800 truncate">{admin.name}</span>
                                <span className="text-[10px] text-slate-400 font-semibold truncate leading-tight mt-0.5">{admin.email}</span>
                                <code className="text-[8px] font-mono text-slate-400 mt-1 truncate">ID: {admin.clerkId}</code>
                            </div>
                        </div>
                        <div className="flex items-center shrink-0">
                            {admin.clerkId === userId ? (
                                <span className="text-[9px] text-purple-600 font-bold bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full select-none">
                                    Você
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onRemoveAdmin(admin.clerkId)}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 cursor-pointer transition-all"
                                    title="Remover Administrador"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
