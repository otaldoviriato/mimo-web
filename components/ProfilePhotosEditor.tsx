'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Loader2, Star, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys, useMyGallery, useUploadPhoto, useUploadToGallery, useDeleteFromGallery, useReorderGallery } from '@/hooks/useQueries';
import type { ProfileGalleryItem } from '@/components/ProfessionalProfilePresentation';

interface Props {
    photoUrl?: string;
}

export function ProfilePhotosEditor({ photoUrl }: Props) {
    const queryClient = useQueryClient();
    const { data: gallery, isLoading, isError } = useMyGallery();
    const uploadPhoto = useUploadPhoto();
    const uploadGallery = useUploadToGallery();
    const deletePhoto = useDeleteFromGallery();
    const reorderGallery = useReorderGallery();

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado local para permitir feedback imediato no drag and drop
    const [orderedItems, setOrderedItems] = useState<ProfileGalleryItem[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const busy = uploadPhoto.isPending || uploadGallery.isPending || deletePhoto.isPending || reorderGallery.isPending || uploading;

    // Constrói lista de fotos públicas unindo photoUrl (se existente) com itens da galeria pública
    const serverPublicItems = useMemo<ProfileGalleryItem[]>(() => {
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

    // Sincroniza o estado local quando os itens do servidor mudam (a menos que esteja arrastando)
    useEffect(() => {
        if (draggedIndex === null) {
            setOrderedItems(serverPublicItems);
        }
    }, [serverPublicItems, draggedIndex]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('A foto deve ter no máximo 10 MB.');
            return;
        }

        setUploading(true);
        const data = new FormData();
        data.append('photo', file);
        data.append('galleryType', 'public');
        data.append('visibility', 'public');

        try {
            await uploadGallery.mutateAsync(data);

            // Se for a primeira foto pública, sincroniza também como photoUrl
            if (!photoUrl || orderedItems.length === 0) {
                const photoData = new FormData();
                photoData.append('photo', file);
                await uploadPhoto.mutateAsync(photoData).catch(() => {});
            }

            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });

            toast.success('Foto adicionada!');
        } catch (error: any) {
            toast.error(error?.message || 'Falha ao enviar foto.');
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
            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao remover foto.');
        }
    };

    // ── DRAG AND DROP (HTML5 + Pointer) ──
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragEnter = (targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) return;
        setDragOverIndex(targetIndex);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        // Reordena o array localmente
        const nextItems = [...orderedItems];
        const [movedItem] = nextItems.splice(draggedIndex, 1);
        nextItems.splice(targetIndex, 0, movedItem);

        setOrderedItems(nextItems);
        setDraggedIndex(null);
        setDragOverIndex(null);

        // Extrai apenas IDs válidos do banco para salvar no backend
        const validIds = nextItems
            .map(item => item._id)
            .filter(id => id && id !== 'profile-photo');

        if (validIds.length > 0) {
            try {
                await reorderGallery.mutateAsync(validIds);
                toast.success('Ordem das fotos atualizada!');
            } catch (err: any) {
                toast.error('Erro ao salvar nova ordem das fotos.');
                // Reverte em caso de erro
                setOrderedItems(serverPublicItems);
            }
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <section aria-label="Fotos do Perfil" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
            {/* Header limpo, sem textão */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Fotos do Perfil</h2>
                    <p className="text-[11px] text-slate-400">Arraste para reorganizar a ordem</p>
                </div>
                {orderedItems.length > 0 && (
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                        {orderedItems.length} {orderedItems.length === 1 ? 'foto' : 'fotos'}
                    </span>
                )}
            </div>

            {/* Input oculto de upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={busy}
            />

            {/* Grid de Fotos estilo Tinder */}
            {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="text-xs">Carregando fotos...</span>
                </div>
            ) : isError ? (
                <div className="py-6 text-center text-rose-500 text-xs font-medium">
                    Não foi possível carregar suas fotos.
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2.5">
                    {orderedItems.map((item, index) => {
                        const isDragging = draggedIndex === index;
                        const isDragOver = dragOverIndex === index;

                        return (
                            <div
                                key={item._id}
                                draggable={!busy}
                                onDragStart={() => handleDragStart(index)}
                                onDragEnter={() => handleDragEnter(index)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(index)}
                                onDragEnd={handleDragEnd}
                                className={`relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border transition-all cursor-grab active:cursor-grabbing select-none group ${
                                    isDragging 
                                        ? 'opacity-30 scale-95 ring-2 ring-purple-600 ring-offset-2' 
                                        : isDragOver
                                            ? 'border-purple-500 scale-102 ring-2 ring-purple-400/50 shadow-md'
                                            : 'border-slate-200/80 shadow-xs hover:border-purple-300'
                                }`}
                            >
                                <Image
                                    src={item.imageUrl}
                                    alt={`Foto ${index + 1}`}
                                    fill
                                    unoptimized
                                    sizes="160px"
                                    className="object-cover pointer-events-none"
                                />

                                {/* Badge da Foto Principal */}
                                {index === 0 && (
                                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs pointer-events-none">
                                        <Star size={10} className="fill-amber-300 text-amber-300" />
                                        Principal
                                    </div>
                                )}

                                {/* Indicador visual de Drag no topo/centro no hover */}
                                <div className="absolute bottom-2 left-2 flex items-center justify-center h-6 w-6 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <GripVertical size={13} />
                                </div>

                                {/* Botão de Excluir Foto */}
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(item);
                                    }}
                                    aria-label={`Excluir foto ${index + 1}`}
                                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-rose-600 transition-colors backdrop-blur-xs shadow-xs cursor-pointer z-10"
                                    title="Excluir foto"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        );
                    })}

                    {/* Slot para Adicionar Foto */}
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
