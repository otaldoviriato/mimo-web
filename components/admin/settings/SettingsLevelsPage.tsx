'use client';

import React, { useState } from 'react';
import { Award, Plus, Trash2, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';

interface ClientLevel {
    id: string;
    name: string;
    minAmount: number;
    color: string;
    icon: 'Award' | 'Medal' | 'Crown' | 'Star';
}

interface Props {
    clientLevels: ClientLevel[];
    setClientLevels: React.Dispatch<React.SetStateAction<ClientLevel[]>>;
    isDirtyLevels: boolean;
    saving: boolean;
    saveSettings: () => Promise<void>;
}

export function SettingsLevelsPage({
    clientLevels,
    setClientLevels,
    isDirtyLevels,
    saving,
    saveSettings
}: Props) {
    // Form de adicionar/editar
    const [name, setName] = useState('');
    const [minAmount, setMinAmount] = useState<number>(0);
    const [color, setColor] = useState('#64748B');
    const [icon, setIcon] = useState<'Award' | 'Medal' | 'Crown' | 'Star'>('Medal');
    
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleAddOrEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (editingId) {
            // Editando
            setClientLevels(prev =>
                prev.map(lvl =>
                    lvl.id === editingId
                        ? { ...lvl, name: name.trim(), minAmount: Number(minAmount), color, icon }
                        : lvl
                ).sort((a, b) => a.minAmount - b.minAmount)
            );
            setEditingId(null);
        } else {
            // Adicionando novo
            const id = 'level_' + Math.random().toString(36).substring(2, 9);
            const newLevel: ClientLevel = {
                id,
                name: name.trim(),
                minAmount: Number(minAmount),
                color,
                icon
            };
            setClientLevels(prev => [...prev, newLevel].sort((a, b) => a.minAmount - b.minAmount));
        }

        // Limpa form
        setName('');
        setMinAmount(0);
        setColor('#64748B');
        setIcon('Medal');
    };

    const handleStartEdit = (lvl: ClientLevel) => {
        setEditingId(lvl.id);
        setName(lvl.name);
        setMinAmount(lvl.minAmount);
        setColor(lvl.color);
        setIcon(lvl.icon);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setName('');
        setMinAmount(0);
        setColor('#64748B');
        setIcon('Medal');
    };

    const handleDelete = (id: string) => {
        if (clientLevels.length <= 1) {
            alert('Você precisa ter pelo menos uma faixa cadastrada.');
            return;
        }
        const confirmDelete = window.confirm('Deseja realmente remover esta faixa? Os usuários enquadrados nela serão reclassificados nas faixas restantes.');
        if (confirmDelete) {
            setClientLevels(prev => prev.filter(lvl => lvl.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyLevels} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                    <Award size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Faixas e Medalhas de Clientes</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Configure dinamicamente as medalhas exibidas no explorar e nos perfis com base nas recargas acumuladas dos últimos 30 dias.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna 1 & 2: Lista de Níveis */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Faixas Cadastradas</span>
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold border border-purple-100">
                                {clientLevels.length} faixas ativas
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {clientLevels.map((lvl) => {
                                return (
                                    <div key={lvl.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            {/* Medalha estilizada baseada na cor e ícone do banco */}
                                            <div 
                                                className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform hover:scale-105 shrink-0"
                                                style={{ 
                                                    backgroundColor: `${lvl.color}15`, 
                                                    borderColor: `${lvl.color}35`,
                                                    color: lvl.color
                                                }}
                                            >
                                                <Award size={20} />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-850">{lvl.name}</span>
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-250">
                                                        Cód: {lvl.id}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                    Recarga mínima de: <strong className="text-slate-700">R$ {lvl.minAmount.toFixed(2)}</strong> nos últimos 30 dias
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleStartEdit(lvl)}
                                                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                                                title="Editar faixa"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lvl.id)}
                                                className="p-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
                                                title="Excluir faixa"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Coluna 3: Criar/Editar */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                            {editingId ? <Edit2 size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
                            {editingId ? 'Editar Faixa' : 'Adicionar Nova Faixa'}
                        </h3>

                        <form onSubmit={handleAddOrEdit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome da Medalha</label>
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: VIP, Bronze, Safira"
                                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor de Corte (R$ nos 30 dias)</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    step="0.01"
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(Number(e.target.value))}
                                    placeholder="Ex: 100.00"
                                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cor Hexadecimal da Medalha</label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="color" 
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                                    />
                                    <input 
                                        type="text" 
                                        required
                                        pattern="^#[0-9A-Fa-f]{6}$"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        placeholder="#64748B"
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ícone Associado</label>
                                <select 
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value as any)}
                                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-700"
                                >
                                    <option value="Medal">Medalha (Padrão)</option>
                                    <option value="Award">Laço de Prêmio</option>
                                    <option value="Crown">Coroa</option>
                                    <option value="Star">Estrela</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    {editingId ? <Check size={14} /> : <Plus size={14} />}
                                    {editingId ? 'Salvar Faixa' : 'Adicionar Faixa'}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 space-y-2">
                        <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <ShieldAlert size={14} className="shrink-0" />
                            Como funciona a classificação
                        </p>
                        <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                            Os usuários são classificados avaliando o total de recargas acumulado nos últimos 30 dias em ordem decrescente de valor mínimo. O sistema enquadrará o usuário na primeira faixa que ele preencher os requisitos.
                        </p>
                        <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                            Novas faixas criadas serão imediatamente aplicadas aos usuários após clicar em <strong>&quot;Salvar alterações&quot;</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
