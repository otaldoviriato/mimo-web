'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile, useUpdateProfile, QueryKeys } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { ProfilePhotosEditor } from '@/components/ProfilePhotosEditor';
import { PrivateGalleryEditor } from '@/components/PrivateGalleryEditor';
import { ArrowLeft, Settings, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditProfilePage() {
    const { user } = useUser();
    const router = useTransitionRouter();
    const queryClient = useQueryClient();
    const { data: userData } = useMyProfile();
    const updateProfileMutation = useUpdateProfile();

    const [bio, setBio] = useState('');
    const [savedBio, setSavedBio] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const hasPopulated = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Inicializa a biografia com os dados do usuário
    useEffect(() => {
        if (userData && !hasPopulated.current) {
            const initialBio = userData.bio || '';
            setBio(initialBio);
            setSavedBio(initialBio);
            hasPopulated.current = true;
        }
    }, [userData]);

    // Limpa o timer ao desmontar
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const profileIsProfessional = !!userData?.isProfessional;

    // Salvamento otimista da biografia com reversão em caso de erro
    const saveBioOptimistic = useCallback(async (newBio: string) => {
        const trimmed = newBio.trim();
        if (trimmed === savedBio.trim()) return;

        const previousBio = savedBio;
        setSavedBio(trimmed);
        setSaveStatus('saving');

        try {
            await updateProfileMutation.mutateAsync({ bio: trimmed });
            setSaveStatus('saved');
            queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            setTimeout(() => {
                setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
            }, 2500);
        } catch (error: any) {
            // Reversão otimista
            setBio(previousBio);
            setSavedBio(previousBio);
            setSaveStatus('idle');
            toast.error('Erro ao salvar biografia. Alteração desfeita.');
        }
    }, [savedBio, updateProfileMutation, queryClient]);

    const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setBio(val);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            saveBioOptimistic(val);
        }, 1000);
    };

    const handleBioBlur = () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        saveBioOptimistic(bio);
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-purple-100 selection:text-purple-900 pb-20">
            {/* Header com botão voltar */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
                        title="Voltar ao perfil"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-extrabold text-white tracking-tight">Editar Perfil</h1>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-4 max-w-md w-full mx-auto">
                {profileIsProfessional ? (
                    <>
                        {/* ── SEÇÃO 1: FOTOS DO PERFIL (PÚBLICAS COM REORDENAÇÃO OTIMISTA) ── */}
                        <ProfilePhotosEditor photoUrl={userData?.photoUrl} />

                        {/* ── SEÇÃO 2: BIOGRAFIA COM AUTO-SAVE OTIMISTA ── */}
                        <section aria-label="Biografia" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-slate-900">Biografia</h2>
                                    {saveStatus === 'saving' && (
                                        <span className="text-[11px] font-medium text-purple-600 flex items-center gap-1 animate-in fade-in duration-200">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                                        </span>
                                    )}
                                    {saveStatus === 'saved' && (
                                        <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in duration-200">
                                            <Check className="w-3 h-3" /> Salvo
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                                    {bio.length}/300
                                </span>
                            </div>
                            <textarea
                                className="w-full text-sm text-slate-900 font-medium placeholder-slate-300 bg-slate-50/60 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 border border-slate-200/80 rounded-xl p-3 resize-none leading-relaxed transition-all"
                                placeholder="Escreva uma breve apresentação sobre você..."
                                rows={4}
                                maxLength={300}
                                value={bio}
                                onChange={handleBioChange}
                                onBlur={handleBioBlur}
                            />
                        </section>

                        {/* ── SEÇÃO 3: GALERIA PRIVADA ── */}
                        <PrivateGalleryEditor />
                    </>
                ) : (
                    /* Para usuários que não são profissionais */
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 text-center space-y-4 my-8">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Configurações da Conta</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Nome, nome de usuário e localização agora são gerenciados na página de Configurações.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push('/settings')}
                            className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            Ir para Configurações
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
