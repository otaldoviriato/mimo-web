'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile, useUpdateProfile, useReorderGallery, QueryKeys } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { ProfilePhotosEditor } from '@/components/ProfilePhotosEditor';
import { PrivateGalleryEditor } from '@/components/PrivateGalleryEditor';
import { ArrowLeft, AlertCircle, RefreshCw, Settings, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditProfilePage() {
    const { user } = useUser();
    const router = useTransitionRouter();
    const queryClient = useQueryClient();
    const { data: userData, isLoading: loadingProfile } = useMyProfile();
    const updateProfileMutation = useUpdateProfile();
    const reorderGalleryMutation = useReorderGallery();

    const [bio, setBio] = useState('');
    const [pendingPhotoIds, setPendingPhotoIds] = useState<string[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');

    const hasPopulated = useRef(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const isLeavingRef = useRef(false);

    useEffect(() => {
        if (userData && !hasPopulated.current) {
            setBio(userData.bio || '');
            hasPopulated.current = true;
        }
    }, [userData]);

    const profileIsProfessional = !!userData?.isProfessional;

    const hasBioChanges = hasPopulated.current && bio !== (userData?.bio || '');
    const hasPhotoChanges = pendingPhotoIds !== null;
    const hasChanges = hasBioChanges || hasPhotoChanges;

    useEffect(() => {
        if (!hasChanges) return;

        window.history.pushState({ editProfileGuard: true }, '', window.location.href);

        const handlePopState = () => {
            if (isLeavingRef.current) return;
            setShowDiscardModal(true);
            window.history.pushState({ editProfileGuard: true }, '', window.location.href);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [hasChanges]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges && !isLeavingRef.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    const handleBack = () => {
        if (hasChanges) {
            setShowDiscardModal(true);
        } else {
            isLeavingRef.current = true;
            router.back();
        }
    };

    const handleConfirmDiscard = () => {
        setShowDiscardModal(false);
        isLeavingRef.current = true;
        router.back();
    };

    const handleSave = async () => {
        setLoading(true);
        setSaveError('');

        try {
            const promises: Promise<any>[] = [];

            if (hasPhotoChanges && pendingPhotoIds && pendingPhotoIds.length > 0) {
                promises.push(reorderGalleryMutation.mutateAsync(pendingPhotoIds));
            }

            if (hasBioChanges) {
                promises.push(updateProfileMutation.mutateAsync({ bio }));
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
                await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            }

            toast.success('Perfil atualizado com sucesso!');
            isLeavingRef.current = true;
            router.back();
        } catch (error: any) {
            setSaveError(error?.message || 'Erro ao salvar alterações.');
        } finally {
            setLoading(false);
        }
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
                        {/* ── SEÇÃO 1: FOTOS DO PERFIL (PÚBLICAS COM DRAG & DROP) ── */}
                        <ProfilePhotosEditor 
                            photoUrl={userData?.photoUrl} 
                            onOrderChange={(newIds, changed) => {
                                setPendingPhotoIds(changed ? newIds : null);
                            }}
                        />

                        {/* ── SEÇÃO 2: BIOGRAFIA ── */}
                        <section aria-label="Biografia" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-900">Biografia</h2>
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
                                onChange={(e) => setBio(e.target.value)}
                            />
                        </section>

                        {/* ── SEÇÃO 3: GALERIA PRIVADA ── */}
                        <PrivateGalleryEditor />

                        {/* Botão de Salvar Alterações (Biografia) */}
                        <div className="mt-2 flex flex-col gap-2">
                            {saveError && (
                                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 border border-rose-100 rounded-xl">
                                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                    <p className="text-xs text-rose-600 font-medium">{saveError}</p>
                                </div>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={loading || !hasChanges}
                                className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {loading ? (
                                    <RefreshCw className="animate-spin w-4 h-4 text-white" />
                                ) : (
                                    <span>Salvar Alterações</span>
                                )}
                            </button>
                        </div>
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

            {/* Modal de Aviso de Alterações Não Salvas */}
            {showDiscardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                            Descartar alterações?
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6">
                            Você fez alterações na sua biografia que ainda não foram salvas. Se sair agora, essas modificações serão perdidas.
                        </p>
                        <div className="flex flex-col gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setShowDiscardModal(false)}
                                className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-all cursor-pointer active:scale-[0.98]"
                            >
                                Continuar editando
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDiscard}
                                className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all cursor-pointer active:scale-[0.98]"
                            >
                                Descartar e sair
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
