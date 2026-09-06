'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Loader2, Lock, Sparkles, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys, useMyGallery, useUploadToGallery, useDeleteFromGallery } from '@/hooks/useQueries';
import type { ProfileGalleryItem } from '@/components/ProfessionalProfilePresentation';

export function PrivateGalleryEditor() {
    const queryClient = useQueryClient();
    const { data: gallery, isLoading, isError } = useMyGallery();
    const uploadGallery = useUploadToGallery();
    const deletePhoto = useDeleteFromGallery();

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const busy = uploadGallery.isPending || deletePhoto.isPending || uploading;

    const privateItems = useMemo<ProfileGalleryItem[]>(() => {
        return Array.isArray(gallery?.privateItems) ? gallery.privateItems : [];
    }, [gallery?.privateItems]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            toast.error('O arquivo deve ter no máximo 20 MB.');
            return;
        }

        setUploading(true);
        const data = new FormData();
        data.append('photo', file);
        data.append('galleryType', 'private');
        data.append('visibility', 'subscribers');

        try {
            await uploadGallery.mutateAsync(data);
            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            toast.success('Mídia exclusiva adicionada!');
        } catch (error: any) {
            toast.error(error?.message || 'Falha ao enviar mídia.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteItem = async (item: ProfileGalleryItem) => {
        if (!window.confirm('Deseja remover esta mídia da sua galeria privada?')) return;

        try {
            await deletePhoto.mutateAsync(item._id);
            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            toast.success('Mídia removida da galeria privada!');
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao remover mídia.');
        }
    };

    return (
        <section aria-label="Galeria Privada" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={busy}
            />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Lock size={15} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Galeria Privada</h2>
                    </div>
                </div>
                {privateItems.length > 0 && (
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                        {privateItems.length} {privateItems.length === 1 ? 'mídia' : 'mídias'}
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="text-xs">Carregando galeria...</span>
                </div>
            ) : isError ? (
                <div className="py-4 text-center text-rose-500 text-xs font-medium">
                    Não foi possível carregar a galeria privada.
                </div>
            ) : privateItems.length === 0 ? (
                /* Estado Vazio Convidativo para Criar Galeria Privada */
                <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/30 p-5 flex flex-col items-center text-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-900">Crie sua galeria privada</h3>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                            Adicione fotos e vídeos exclusivos visíveis apenas para os assinantes do seu perfil.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Plus size={15} />
                                Adicionar fotos à galeria privada
                            </>
                        )}
                    </button>
                </div>
            ) : (
                /* Grid de Mídias Privadas */
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                    {privateItems.map((item, index) => (
                        <div
                            key={item._id}
                            className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs group"
                        >
                            {item.mediaType === 'video' ? (
                                <>
                                    <video src={item.imageUrl} preload="metadata" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                                            <Video size={15} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Image
                                    src={item.imageUrl}
                                    alt={`Mídia exclusiva ${index + 1}`}
                                    fill
                                    unoptimized
                                    sizes="160px"
                                    className="object-cover"
                                />
                            )}

                            {/* Badge de Cadeado */}
                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/65 backdrop-blur-xs text-purple-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                                <Lock size={10} />
                            </div>

                            {/* Botão de Excluir */}
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDeleteItem(item)}
                                aria-label={`Excluir mídia ${index + 1}`}
                                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-rose-600 transition-colors backdrop-blur-xs shadow-xs cursor-pointer"
                                title="Excluir mídia"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}

                    {/* Slot para adicionar mais mídias */}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileInputRef.current?.click()}
                        className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/40 hover:bg-purple-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-purple-600 disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                <span className="text-[10px] font-bold text-purple-700">Enviando...</span>
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs border border-purple-100 text-purple-600">
                                    <Plus size={18} strokeWidth={2.5} />
                                </div>
                                <span className="text-[10px] font-bold text-purple-700">Adicionar</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </section>
    );
}
