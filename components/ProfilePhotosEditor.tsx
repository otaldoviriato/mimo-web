'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Loader2, Lock, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyGallery, useUploadPhoto, useUploadToGallery, useDeleteFromGallery, useUpdateGalleryItemVisibility } from '@/hooks/useQueries';
import type { ProfileGalleryItem } from '@/components/ProfessionalProfilePresentation';

interface Props {
    photoUrl?: string;
}

export function ProfilePhotosEditor({ photoUrl }: Props) {
    const { data: gallery, isLoading, isError } = useMyGallery();
    const uploadPhoto = useUploadPhoto();
    const uploadGallery = useUploadToGallery();
    const deletePhoto = useDeleteFromGallery();
    const updateVisibility = useUpdateGalleryItemVisibility();

    const [tab, setTab] = useState<'public' | 'private'>('public');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const busy = uploadPhoto.isPending || uploadGallery.isPending || deletePhoto.isPending || updateVisibility.isPending || uploading;

    // Constrói lista de fotos públicas unindo photoUrl (se existente) com itens da galeria pública
    const publicItems = useMemo<ProfileGalleryItem[]>(() => {
        const rawItems: ProfileGalleryItem[] = Array.isArray(gallery?.publicItems) 
            ? gallery.publicItems 
            : Array.isArray(gallery?.items) 
                ? gallery.items.filter((item: any) => item.galleryType !== 'private' && item.visibility !== 'subscribers')
                : [];

        const candidates: ProfileGalleryItem[] = [];
        if (photoUrl) {
            candidates.push({ _id: 'profile-photo', imageUrl: photoUrl });
        }
        for (const item of rawItems) {
            if (item.imageUrl && !candidates.some(c => c.imageUrl === item.imageUrl)) {
                candidates.push(item);
            }
        }
        return candidates;
    }, [gallery?.publicItems, gallery?.items, photoUrl]);

    const privateItems = useMemo<ProfileGalleryItem[]>(() => {
        return Array.isArray(gallery?.privateItems) ? gallery.privateItems : [];
    }, [gallery?.privateItems]);

    const currentItems = tab === 'public' ? publicItems : privateItems;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
            toast.error('O arquivo deve ter no máximo 8 MB.');
            return;
        }

        setUploading(true);
        const data = new FormData();
        data.append('photo', file);
        data.append('galleryType', tab);
        data.append('visibility', tab === 'private' ? 'subscribers' : 'public');

        try {
            // Envia para a galeria
            await uploadGallery.mutateAsync(data);

            // Se for a primeira foto pública ou se a usuária ainda não tiver foto de perfil, sincroniza também como photoUrl
            if (tab === 'public' && (!photoUrl || publicItems.length === 0)) {
                const photoData = new FormData();
                photoData.append('photo', file);
                await uploadPhoto.mutateAsync(photoData).catch(() => {});
            }

            toast.success(tab === 'public' ? 'Foto adicionada ao perfil!' : 'Mídia exclusiva adicionada!');
        } catch (error: any) {
            toast.error(error?.message || 'Falha ao enviar foto. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteItem = async (item: ProfileGalleryItem) => {
        if (!window.confirm('Deseja remover esta foto do seu perfil?')) return;

        try {
            if (item._id === 'profile-photo') {
                toast.success('Foto removida!');
            } else {
                await deletePhoto.mutateAsync(item._id);
                toast.success('Foto removida do perfil!');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao remover foto.');
        }
    };

    return (
        <section aria-label="Gerenciar fotos do perfil" className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4 shadow-xs">
            {/* Header com Abas */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Fotos do Perfil</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {tab === 'public' 
                            ? 'Fotos públicas exibidas no seu card estilo Tinder' 
                            : 'Mídias exclusivas para assinantes do seu perfil'}
                    </p>
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setTab('public')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                            tab === 'public' 
                                ? 'bg-white text-purple-600 shadow-xs' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Públicas ({publicItems.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('private')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                            tab === 'private' 
                                ? 'bg-white text-purple-600 shadow-xs' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Exclusivas ({privateItems.length})
                    </button>
                </div>
            </div>

            {/* Input oculto de upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept={tab === 'private' ? 'image/*,video/*' : 'image/*'}
                className="hidden"
                onChange={handleFileSelect}
                disabled={busy}
            />

            {/* Grid de Fotos estilo Tinder */}
            {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="text-xs">Carregando suas fotos...</span>
                </div>
            ) : isError ? (
                <div className="py-8 text-center text-rose-500 text-xs font-medium">
                    Não foi possível carregar suas fotos. Recarregue a página.
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2.5">
                    {/* Lista de fotos existentes */}
                    {currentItems.map((item, index) => (
                        <div 
                            key={item._id} 
                            className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs group"
                        >
                            {item.mediaType === 'video' ? (
                                <video src={item.imageUrl} preload="metadata" className="h-full w-full object-cover" />
                            ) : (
                                <Image
                                    src={item.imageUrl}
                                    alt={`Foto ${index + 1}`}
                                    fill
                                    unoptimized
                                    sizes="160px"
                                    className="object-cover"
                                />
                            )}

                            {/* Badge da Foto Principal */}
                            {tab === 'public' && index === 0 && (
                                <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-900/75 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                    <Star size={10} className="fill-amber-300 text-amber-300" />
                                    Principal
                                </div>
                            )}

                            {/* Badge de Conteúdo Exclusivo */}
                            {tab === 'private' && (
                                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs text-purple-200 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                    <Lock size={10} />
                                    Exclusivo
                                </div>
                            )}

                            {/* Botão de Excluir Foto */}
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDeleteItem(item)}
                                aria-label={`Excluir foto ${index + 1}`}
                                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-rose-600 transition-colors backdrop-blur-xs shadow-xs cursor-pointer"
                                title="Excluir foto"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}

                    {/* Slot para Adicionar Foto */}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileInputRef.current?.click()}
                        className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/40 hover:bg-purple-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-purple-600 disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                <span className="text-[11px] font-bold text-purple-700">Enviando...</span>
                            </>
                        ) : (
                            <>
                                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-xs border border-purple-100 text-purple-600">
                                    <Plus size={20} strokeWidth={2.5} />
                                </div>
                                <span className="text-[11px] font-bold text-purple-700">Adicionar</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            <p className="text-[11px] text-slate-400 leading-normal">
                {tab === 'public' 
                    ? 'A primeira foto é a principal e aparece na capa do seu perfil e nos chats.'
                    : 'Vídeos e fotos privadas ficam visíveis exclusivamente para seus assinantes.'}
            </p>
        </section>
    );
}
