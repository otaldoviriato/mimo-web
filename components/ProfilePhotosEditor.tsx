'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { 
    Plus, 
    Trash2, 
    Loader2, 
    Star, 
    GripVertical, 
    Camera, 
    ChevronLeft, 
    ChevronRight 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { 
    QueryKeys, 
    useMyGallery, 
    useUploadPhoto, 
    useUploadToGallery, 
    useDeleteFromGallery, 
    useReorderGallery 
} from '@/hooks/useQueries';
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
    const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceFileInputRef = useRef<HTMLInputElement>(null);

    // Estado local para permitir feedback imediato no drag and drop
    const [orderedItems, setOrderedItems] = useState<ProfileGalleryItem[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

    // Pointer events para suporte fluido e infalível em desktop e touch mobile
    const pointerDragRef = useRef<{
        startX: number;
        startY: number;
        index: number;
        active: boolean;
        pointerId: number;
        element: HTMLElement;
    } | null>(null);

    const busy = 
        uploadPhoto.isPending || 
        uploadGallery.isPending || 
        deletePhoto.isPending || 
        reorderGallery.isPending || 
        uploading;

    // Constrói lista de fotos públicas unindo os itens do servidor
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

    // Sincroniza o estado local quando os itens do servidor mudam (a menos que esteja arrastando)
    useEffect(() => {
        if (draggedIndex === null) {
            setOrderedItems(serverPublicItems);
        }
    }, [serverPublicItems, draggedIndex]);

    // Reordena e persiste no servidor
    const applyReorder = async (fromIndex: number, toIndex: number) => {
        if (
            fromIndex === toIndex || 
            fromIndex < 0 || 
            toIndex < 0 || 
            fromIndex >= orderedItems.length || 
            toIndex >= orderedItems.length ||
            busy
        ) {
            return;
        }

        const nextItems = [...orderedItems];
        const [moved] = nextItems.splice(fromIndex, 1);
        nextItems.splice(toIndex, 0, moved);

        setOrderedItems(nextItems);

        const validIds = nextItems
            .map(item => item._id)
            .filter(id => id && id !== 'profile-photo');

        if (validIds.length > 0) {
            try {
                await reorderGallery.mutateAsync(validIds);
                await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
                await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });

                if (toIndex === 0) {
                    toast.success('Foto de perfil atualizada!');
                } else {
                    toast.success('Ordem das fotos atualizada!');
                }
            } catch (err: any) {
                toast.error('Erro ao salvar nova ordem das fotos.');
                setOrderedItems(serverPublicItems);
            }
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
            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            toast.success('Foto adicionada ao perfil!');
        } catch (error: any) {
            toast.error(error?.message || 'Falha ao enviar foto.');
        } finally {
            setUploading(false);
        }
    };

    // Substituição de foto específica
    const handleReplaceClick = (item: ProfileGalleryItem) => {
        setReplaceTargetId(item._id);
        replaceFileInputRef.current?.click();
    };

    const handleReplaceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('A foto deve ter no máximo 10 MB.');
            setReplaceTargetId(null);
            return;
        }

        setUploading(true);
        const data = new FormData();
        data.append('photo', file);
        data.append('galleryType', 'public');
        data.append('visibility', 'public');
        if (replaceTargetId && replaceTargetId !== 'profile-photo') {
            data.append('replaceItemId', replaceTargetId);
        }

        try {
            await uploadGallery.mutateAsync(data);

            // Se era a primeira foto ou o id temporário profile-photo, atualiza também a foto de perfil
            if (!replaceTargetId || replaceTargetId === 'profile-photo' || replaceTargetId === orderedItems[0]?._id) {
                const photoData = new FormData();
                photoData.append('photo', file);
                await uploadPhoto.mutateAsync(photoData).catch(() => {});
            }

            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            toast.success('Foto substituída com sucesso!');
        } catch (error: any) {
            toast.error(error?.message || 'Falha ao substituir foto.');
        } finally {
            setUploading(false);
            setReplaceTargetId(null);
        }
    };

    // Excluir foto
    const handleDeleteItem = async (item: ProfileGalleryItem) => {
        if (!window.confirm('Deseja remover esta foto do seu perfil?')) return;

        try {
            if (item._id && item._id !== 'profile-photo') {
                await deletePhoto.mutateAsync(item._id);
            }
            await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            await queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
            toast.success('Foto removida do perfil!');
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao remover foto.');
        }
    };

    // ─── POINTER CAPTURE DRAG & DROP (UNIVERSAL: DESKTOP + TOUCH) ───
    const startPointerDrag = (e: React.PointerEvent<HTMLElement>, index: number) => {
        if (e.button !== 0 || busy) return;

        const currentTarget = e.currentTarget;
        try {
            currentTarget.setPointerCapture(e.pointerId);
        } catch {}

        pointerDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            index,
            active: false,
            pointerId: e.pointerId,
            element: currentTarget,
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
        if (!pointerDragRef.current) return;

        const dx = e.clientX - pointerDragRef.current.startX;
        const dy = e.clientY - pointerDragRef.current.startY;
        const dist = Math.hypot(dx, dy);

        // Ativa o arraste quando move mais de 4px
        if (!pointerDragRef.current.active && dist > 4) {
            pointerDragRef.current.active = true;
            setDraggedIndex(pointerDragRef.current.index);
        }

        if (pointerDragRef.current.active) {
            setDragPosition({ x: e.clientX, y: e.clientY });

            // Identifica o card sob o ponteiro
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            for (const el of elements) {
                const card = el.closest('[data-photo-index]');
                if (card) {
                    const targetIdx = Number(card.getAttribute('data-photo-index'));
                    if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < orderedItems.length) {
                        setDragOverIndex(targetIdx);
                        break;
                    }
                }
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
        if (pointerDragRef.current) {
            try {
                pointerDragRef.current.element.releasePointerCapture(e.pointerId);
            } catch {}

            const fromIdx = pointerDragRef.current.index;
            const toIdx = dragOverIndex;

            if (pointerDragRef.current.active && fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
                applyReorder(fromIdx, toIdx);
            }
        }

        pointerDragRef.current = null;
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDragPosition(null);
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLElement>) => {
        if (pointerDragRef.current) {
            try {
                pointerDragRef.current.element.releasePointerCapture(e.pointerId);
            } catch {}
        }
        pointerDragRef.current = null;
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDragPosition(null);
    };

    return (
        <section aria-label="Fotos do Perfil" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
            {/* Header com resumo */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Fotos do Perfil</h2>
                    <p className="text-[11px] text-slate-500">
                        A primeira foto é a sua foto de perfil. Puxe pelo botão Mover para trocar de lugar.
                    </p>
                </div>
                {orderedItems.length > 0 && (
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full shrink-0">
                        {orderedItems.length} {orderedItems.length === 1 ? 'foto' : 'fotos'}
                    </span>
                )}
            </div>

            {/* Inputs ocultos de upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={busy}
            />

            <input
                ref={replaceFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReplaceFileSelect}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {orderedItems.map((item, index) => {
                        const isPrimary = index === 0;
                        const isDragging = draggedIndex === index;
                        const isDragOver = dragOverIndex === index && draggedIndex !== index;

                        return (
                            <div
                                key={item._id || `photo-${index}`}
                                data-photo-index={index}
                                className={`group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border transition-all select-none ${
                                    isDragging 
                                        ? 'opacity-30 scale-95 ring-2 ring-purple-600 ring-offset-2 border-dashed border-purple-500 z-10' 
                                        : isDragOver
                                            ? 'border-purple-600 scale-102 ring-4 ring-purple-400/50 shadow-xl z-20 bg-purple-50/20'
                                            : isPrimary
                                                ? 'border-purple-300 ring-2 ring-purple-100 shadow-sm'
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

                                {/* Gradiente escuro para legibilidade dos botões e badges */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                                {/* Badge de Foto de Perfil / Principal */}
                                {isPrimary ? (
                                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-600/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm pointer-events-none z-10">
                                        <Star size={11} className="fill-amber-300 text-amber-300" />
                                        <span>Perfil</span>
                                    </div>
                                ) : (
                                    <div className="absolute top-2 left-2 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold h-5 w-5 rounded-full backdrop-blur-xs pointer-events-none z-10">
                                        {index + 1}
                                    </div>
                                )}

                                {/* Ações do Topo: Botão de Substituir e Excluir */}
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReplaceClick(item);
                                        }}
                                        aria-label="Substituir foto"
                                        title="Substituir esta foto por outra"
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white hover:text-purple-700 backdrop-blur-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                                    >
                                        <Camera size={13} />
                                    </button>

                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteItem(item);
                                        }}
                                        aria-label="Excluir foto"
                                        title="Excluir foto"
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-rose-600 hover:text-white backdrop-blur-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>

                                {/* Overlay indicador de Soltar aqui (Drop Target) */}
                                {isDragOver && (
                                    <div className="absolute inset-0 bg-purple-600/20 backdrop-blur-xs flex items-center justify-center z-10 pointer-events-none animate-in fade-in duration-150">
                                        <div className="bg-purple-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
                                            {index === 0 ? <Star size={13} className="fill-amber-300 text-amber-300" /> : null}
                                            <span>{index === 0 ? 'Nova Foto de Perfil' : `Mover para Posição ${index + 1}`}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Ações do Rodapé do Card */}
                                <div className="absolute bottom-2 inset-x-2 flex items-center justify-between z-10 gap-1">
                                    {/* Handle de Arraste Universal com Pointer Capture */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onPointerDown={(e) => startPointerDrag(e, index)}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerCancel}
                                        style={{ touchAction: 'none' }}
                                        aria-label="Segure e arraste para mover"
                                        title="Clique/toque e arraste para mudar a posição"
                                        className="touch-none select-none flex h-7 px-2.5 items-center justify-center rounded-lg bg-black/60 hover:bg-purple-600 active:bg-purple-700 text-white backdrop-blur-xs text-[10px] font-bold transition-all cursor-grab active:cursor-grabbing gap-1 shadow-sm"
                                    >
                                        <GripVertical size={13} />
                                        <span>Mover</span>
                                    </div>

                                    {/* Ação rápida para Fotos Secundárias: Definir como foto de perfil ou setas */}
                                    {!isPrimary && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyReorder(index, 0);
                                                }}
                                                aria-label="Tornar foto de perfil"
                                                title="Definir como Foto de Perfil principal"
                                                className="flex h-7 px-2 items-center justify-center rounded-lg bg-white/95 hover:bg-purple-600 hover:text-white text-purple-700 text-[10px] font-bold backdrop-blur-xs shadow-sm transition-all active:scale-95 cursor-pointer gap-1"
                                            >
                                                <Star size={11} className="fill-purple-600 group-hover:fill-white text-purple-600" />
                                                <span>Principal</span>
                                            </button>

                                            <div className="hidden sm:flex items-center gap-0.5 bg-black/45 rounded-lg p-0.5">
                                                <button
                                                    type="button"
                                                    disabled={busy || index === 0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        applyReorder(index, index - 1);
                                                    }}
                                                    title="Mover para esquerda"
                                                    className="flex h-6 w-5 items-center justify-center text-white hover:bg-white/20 rounded disabled:opacity-30 cursor-pointer"
                                                >
                                                    <ChevronLeft size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy || index === orderedItems.length - 1}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        applyReorder(index, index + 1);
                                                    }}
                                                    title="Mover para direita"
                                                    className="flex h-6 w-5 items-center justify-center text-white hover:bg-white/20 rounded disabled:opacity-30 cursor-pointer"
                                                >
                                                    <ChevronRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                        transform: 'translate(-50%, -50%) rotate(2deg) scale(1.08)',
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
                    <div className="absolute inset-0 bg-purple-600/10 pointer-events-none" />
                </div>,
                document.body
            )}
        </section>
    );
}
