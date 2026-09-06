'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ImageCropper } from '@/components/ImageCropper';
import { useMyGallery, useUploadPhoto, useUploadToGallery, useDeleteFromGallery, useUpdateGalleryItemVisibility } from '@/hooks/useQueries';
import type { ProfileGalleryItem } from '@/components/ProfessionalProfilePresentation';

export function ProfilePhotosEditor({ photoUrl }: { photoUrl?: string }) {
    const { data: gallery, isLoading, isError } = useMyGallery();
    const uploadPhoto = useUploadPhoto();
    const uploadGallery = useUploadToGallery();
    const deletePhoto = useDeleteFromGallery();
    const updateVisibility = useUpdateGalleryItemVisibility();
    const [tab, setTab] = useState<'public' | 'private'>('public');
    const [visibility, setVisibility] = useState<'public' | 'subscribers'>('public');
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [galleryFile, setGalleryFile] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const avatarInput = useRef<HTMLInputElement>(null);
    const galleryInput = useRef<HTMLInputElement>(null);
    const busy = uploadPhoto.isPending || uploadGallery.isPending || deletePhoto.isPending || updateVisibility.isPending;
    const items: ProfileGalleryItem[] = tab === 'public' ? gallery?.publicItems ?? gallery?.items ?? [] : gallery?.privateItems ?? [];

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const reportError = (error: unknown) => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a foto. Tente novamente.');
    const saveAvatar = async (file: File) => {
        if (busy) return;
        const data = new FormData();
        data.append('photo', file);
        try {
            await uploadPhoto.mutateAsync(data);
            setCropFile(null);
            toast.success('Foto de perfil atualizada');
        } catch (error) { reportError(error); }
    };
    const addPhoto = async () => {
        if (!galleryFile || busy) return;
        const data = new FormData();
        data.append('photo', galleryFile, `${tab}_${Date.now()}.${galleryFile.name.split('.').pop() || 'jpg'}`);
        data.append('galleryType', tab);
        data.append('visibility', tab === 'private' ? 'subscribers' : visibility);
        try {
            await uploadGallery.mutateAsync(data);
            setGalleryFile(null);
            toast.success('Galeria atualizada');
        } catch (error) { reportError(error); }
    };

    return (
        <section aria-label="Editar fotos" className="rounded-2xl border border-slate-100 bg-white p-4 space-y-4">
            <div className="flex items-center gap-4">
                <Avatar uri={photoUrl} size={64} />
                <div><h2 className="text-sm font-semibold text-slate-900">Suas fotos</h2><Button title="Alterar foto de perfil" variant="ghost" size="sm" icon={<Camera size={15} />} onClick={() => avatarInput.current?.click()} disabled={busy || !!galleryFile} /></div>
            </div>
            <p className="text-xs leading-5 text-slate-500">As alterações nas fotos são salvas imediatamente.</p>
            <input ref={avatarInput} aria-label="Selecionar foto de perfil" type="file" accept="image/*" className="hidden" onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) { setPreview(URL.createObjectURL(file)); setCropFile(file); }
            }} />
            <div className="flex gap-2" role="group" aria-label="Galerias">
                <Button title="Pública" variant={tab === 'public' ? 'secondary' : 'ghost'} onClick={() => setTab('public')} disabled={busy || !!galleryFile} className="flex-1" />
                <Button title="Privada" variant={tab === 'private' ? 'secondary' : 'ghost'} onClick={() => setTab('private')} disabled={busy || !!galleryFile} className="flex-1" />
            </div>
            {tab === 'private' && <p className="text-xs leading-5 text-slate-500">Fotos e vídeos exclusivos para assinantes.</p>}
            {isLoading ? <p role="status" className="text-sm text-slate-500">Carregando fotos...</p> : isError ? <p role="alert" className="text-sm text-red-600">Não foi possível carregar a galeria.</p> : items.length ? (
                <div className="grid grid-cols-2 gap-3">
                    {items.map((item, index) => <div key={item._id} className="min-w-0 space-y-2">
                        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100">
                            {item.mediaType === 'video' ? <video src={item.imageUrl} controls preload="metadata" className="h-full w-full object-contain" /> : <Image src={item.imageUrl} alt={`Foto ${index + 1} da galeria`} fill unoptimized sizes="200px" className="object-contain" />}
                            <button type="button" disabled={busy} aria-label={`Excluir foto ${index + 1}`} onClick={async () => {
                                if (!window.confirm('Tem certeza que deseja remover este item da galeria?')) return;
                                try { await deletePhoto.mutateAsync(item._id); toast.success('Item excluído'); } catch (error) { reportError(error); }
                            }} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-600"><Trash2 size={16} /></button>
                        </div>
                        {tab === 'public' && <select aria-label={`Visibilidade da foto ${index + 1}`} value={item.visibility || 'public'} disabled={busy} onChange={async event => {
                            try { await updateVisibility.mutateAsync({ itemId: item._id, visibility: event.target.value as 'public' | 'subscribers' }); } catch (error) { reportError(error); }
                        }} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value="public">Pública</option><option value="subscribers">Para assinantes</option></select>}
                    </div>)}
                </div>
            ) : <p className="py-4 text-center text-sm text-slate-400">Nenhuma foto nesta galeria.</p>}
            <input ref={galleryInput} aria-label="Selecionar arquivo para galeria" type="file" accept={tab === 'private' ? 'image/*,video/*' : 'image/*'} className="hidden" onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                if (file.size > 8 * 1024 * 1024) { toast.error('Escolha um arquivo de até 8 MB.'); return; }
                setVisibility('public'); setPreview(URL.createObjectURL(file)); setGalleryFile(file);
            }} />
            {galleryFile ? <div className="space-y-3 rounded-xl border border-purple-100 p-3">
                {preview && <div className="relative h-40 overflow-hidden rounded-lg bg-slate-100">{galleryFile.type.startsWith('video/') ? <video src={preview} controls className="h-full w-full object-contain" /> : <Image src={preview} alt="Prévia da nova foto" fill unoptimized className="object-contain" />}</div>}
                {tab === 'public' && <label className="block text-xs text-slate-600">Quem pode ver esta foto?<select value={visibility} onChange={event => setVisibility(event.target.value as 'public' | 'subscribers')} disabled={busy} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"><option value="public">Todos</option><option value="subscribers">Somente assinantes</option></select></label>}
                <div className="flex gap-2"><Button title="Cancelar" variant="ghost" onClick={() => setGalleryFile(null)} disabled={busy} /><Button title="Adicionar à galeria" onClick={addPhoto} loading={uploadGallery.isPending} disabled={busy} /></div>
            </div> : <Button title={tab === 'public' ? 'Adicionar foto' : 'Adicionar foto ou vídeo'} variant="outline" onClick={() => galleryInput.current?.click()} disabled={busy || isLoading || isError} className="w-full" />}
            {cropFile && preview && createPortal(<ImageCropper imageSrc={preview} circular aspectRatio={1} onCrop={saveAvatar} onCancel={() => setCropFile(null)} />, document.body)}
        </section>
    );
}
