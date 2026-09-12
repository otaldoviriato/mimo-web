'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { usePhotoDrag } from '@/hooks/usePhotoDrag';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { 
    QueryKeys, 
    useMyGallery, 
    useUploadToGallery, 
    useDeleteFromGallery,
    useReorderGallery 
} from '@/hooks/useQueries';
import type { ProfileGalleryItem } from '@/components/ProfessionalProfilePresentation';

interface Props {
    photoUrl?: string;
    onOrderChange?: (orderedIds: string[], hasChanged: boolean) => void;
}

function triggerHapticFeedback() {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
        try {
            navigator.vibrate(50);
        } catch {}
    }
}

export function ProfilePhotosEditor({ photoUrl, onOrderChange }: Props) {
    const queryClient = useQueryClient();
    const { data: gallery, isLoading, isError } = useMyGallery();
    const uploadGallery = useUploadToGallery();
    const deletePhoto = useDeleteFromGallery();
    const reorderGallery = useReorderGallery();

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado local das fotos para reordenação puramente no front-end
    const [orderedItems, setOrderedItems] = useState<ProfileGalleryItem[]>([]);
    const initialIdsRef = useRef<string[]>([]);
    const hasInitializedRef = useRef(false);
    const busy = uploadGallery.isPending || deletePhoto.isPending || reorderGallery.isPending || uploading;

    // Lista de fotos públicas do servidor
    const serverPublicItems = useMemo<ProfileGalleryItem[]>(() => {
        const rawItems: ProfileGalleryItem[] = Array.isArray(gallery?.publicItems) 
            ? gallery.publicItems 
            : Array.isArray(gallery?.items) 
                ? gallery.items.filter((item: any) => item.galleryType !== 'private' && item.visibility !== 'subscribers')
                : [];

        if (rawItems.length > 0) {
            return rawItems;
        }
        if (photoUrl) {
            return [{ _id: 'profile-photo', imageUrl: photoUrl }];
        }
        return [];
    }, [gallery?.publicItems, gallery?.items, photoUrl]);

    // Inicializa a lista e guarda os IDs originais
    useEffect(() => {
        if (!hasInitializedRef.current && serverPublicItems.length > 0) {
            setOrderedItems(serverPublicItems);
            initialIdsRef.current = serverPublicItems.map(item => item._id).filter(Boolean);
            hasInitializedRef.current = true;
        } else if (!hasInitializedRef.current) {
            setOrderedItems(serverPublicItems);
        }
    }, [serverPublicItems]);

    // Reordenação otimista imediata com persistência automática
    const applyReorder = async (fromIndex: number, toIndex: number) => {
        if (
            fromIndex === toIndex || 
            fromIndex < 0 || 
            toIndex < 0 || 
            fromIndex >= orderedItems.length || 
            toIndex >= orderedItems.length
        ) {
            return;
        }

        const previousItems = [...orderedItems];
        const nextItems = [...orderedItems];
        const [moved] = nextItems.splice(fromIndex, 1);
        nextItems.splice(toIndex, 0, moved);

        // Atualização otimista imediata na interface
        setOrderedItems(nextItems);

        const currentIds = nextItems
            .map(item => item._id)
            .filter(id => id && id !== 'profile-photo');

        onOrderChange?.(currentIds, true);

        try {
            await reorderGallery.mutateAsync(currentIds);
            initialIdsRef.current = currentIds;
            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            toast.success('Ordem das fotos atualizada!');
            onOrderChange?.(currentIds, false);
        } catch (error: any) {
            // Reversão otimista em caso de falha
            setOrderedItems(previousItems);
            onOrderChange?.(initialIdsRef.current, false);
            toast.error('Erro ao salvar nova ordem. Alteração desfeita.');
        }
    };

    // Upload de nova foto
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
            hasInitializedRef.current = false;
            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            toast.success('Foto adicionada!');
        } catch (error: any) {
            toast.error(error?.message || 'Falha ao enviar foto.');
        } finally {
            setUploading(false);
        }
    };

    // Excluir foto
    const handleDeleteItem = async (item: ProfileGalleryItem) => {
        if (!window.confirm('Deseja remover esta foto do seu perfil?')) return;

        try {
            if (item._id && item._id !== 'profile-photo') {
                await deletePhoto.mutateAsync(item._id);
            }
            hasInitializedRef.current = false;
            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            toast.success('Foto removida!');
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao remover foto.');
        }
    };

    const { gridRef, draggedIndex, dragOverIndex, dragPosition, selectingIndex, onPointerDown, onTouchStart } = usePhotoDrag(orderedItems.length, busy, (from, to) => { void applyReorder(from, to); }, triggerHapticFeedback);

    return (
        <section aria-label="Fotos do Perfil" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Fotos do Perfil</h2>
                    <p className="text-[11px] text-slate-400">
                        Segure o dedo sobre a foto para selecionar e reposicionar. A 1ª foto será o seu perfil.
                    </p>
                </div>
                {orderedItems.length > 0 && (
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full shrink-0">
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
                <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {orderedItems.map((item, index) => {
                        const isDragging = draggedIndex === index;
                        const isDragOver = dragOverIndex === index && draggedIndex !== index;
                        const isSelecting = selectingIndex === index;

                        return (
                            <div
                                key={item._id || `photo-${index}`}
                                data-photo-index={index}
                                onPointerDown={(e) => onPointerDown(e, index)}
                                onTouchStart={(e) => onTouchStart(e, index)}
                                style={{ touchAction: 'pan-y', WebkitTouchCallout: 'none' }}
                                className={`group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border transition-all select-none ${
                                    isDragging 
                                        ? 'opacity-20 scale-95 ring-4 ring-purple-600 ring-offset-2 border-dashed border-purple-500 z-10 cursor-grabbing' 
                                        : isDragOver
                                            ? 'border-purple-600 scale-102 ring-4 ring-purple-400/50 shadow-xl z-20 bg-purple-50/20'
                                            : isSelecting
                                                ? 'scale-[0.98] ring-2 ring-purple-400 border-purple-400 shadow-sm'
                                                : index === 0
                                                    ? 'border-purple-300 ring-2 ring-purple-100/80 shadow-xs'
                                                    : 'border-slate-200/90 shadow-xs hover:border-purple-200'
                                }`}
                            >
                                <Image
                                    src={item.imageUrl}
                                    alt={`Foto ${index + 1}`}
                                    fill
                                    unoptimized
                                    draggable={false}
                                    sizes="(max-width: 640px) 50vw, 200px"
                                    className="object-cover pointer-events-none"
                                />

                                {/* Indicador sutil da posição numérica */}
                                <div className="absolute top-2 left-2 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold h-5 w-5 rounded-full backdrop-blur-xs pointer-events-none z-10">
                                    {index + 1}
                                </div>

                                {/* Botão de Excluir Foto no topo direito */}
                                <button
                                    type="button"
                                    disabled={busy}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(item);
                                    }}
                                    aria-label="Excluir foto"
                                    title="Excluir foto"
                                    className="absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-rose-600 backdrop-blur-xs shadow-sm transition-all active:scale-90 cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        );
                    })}

                    {/* Slot para Adicionar Nova Foto */}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileInputRef.current?.click()}
                        className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/40 hover:bg-purple-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-purple-600 disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                <span className="text-[11px] font-bold text-purple-700">Enviando...</span>
                            </>
                        ) : (
                            <>
                                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-xs border border-purple-100 text-purple-600">
                                    <Plus size={18} strokeWidth={2.5} />
                                </div>
                                <span className="text-[11px] font-bold text-purple-700">Adicionar Foto</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Ghost Preview Flutuante que acompanha o cursor ou toque */}
            {typeof document !== 'undefined' && dragPosition && draggedIndex !== null && orderedItems[draggedIndex] && createPortal(
                <div 
                    style={{
                        position: 'fixed',
                        left: `${dragPosition.x}px`,
                        top: `${dragPosition.y}px`,
                        transform: 'translate(-50%, -50%) rotate(2deg) scale(1.06)',
                        pointerEvents: 'none',
                        zIndex: 99999,
                        touchAction: 'none',
                    }}
                    className="w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ring-4 ring-purple-600 border-2 border-white bg-slate-900 transition-transform select-none"
                >
                    <img 
                        src={orderedItems[draggedIndex].imageUrl} 
                        alt="Foto sendo movida" 
                        className="w-full h-full object-cover pointer-events-none"
                    />
                </div>,
                document.body
            )}
        </section>
    );
}
