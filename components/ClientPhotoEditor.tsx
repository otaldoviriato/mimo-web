'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/Avatar';
import { useUploadPhoto } from '@/hooks/useQueries';

export function ClientPhotoEditor({ photoUrl }: { photoUrl?: string }) {
    const uploadPhoto = useUploadPhoto();
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione uma imagem.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('A foto deve ter no máximo 10 MB.');
            return;
        }

        // Pré-visualização otimista
        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);

        const data = new FormData();
        data.append('photo', file);
        try {
            await uploadPhoto.mutateAsync(data);
            toast.success('Foto atualizada!');
        } catch {
            toast.error('Falha ao enviar a foto.');
        } finally {
            setPreview(null);
            URL.revokeObjectURL(localUrl);
        }
    };

    return (
        <section aria-label="Foto de perfil" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs flex flex-col items-center gap-3">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploadPhoto.isPending}
                className="relative rounded-full focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:outline-offset-4 cursor-pointer"
                aria-label="Alterar foto de perfil"
            >
                <Avatar uri={preview || photoUrl} size={104} />
                <span className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center border-4 border-white shadow-sm">
                    {uploadPhoto.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </span>
            </button>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploadPhoto.isPending}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 disabled:opacity-60 cursor-pointer"
            >
                {photoUrl ? 'Alterar foto' : 'Adicionar foto'}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </section>
    );
}
