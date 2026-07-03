'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperProps {
    imageSrc: string;
    circular?: boolean;
    aspectRatio: number; // width / height (ex: 1 para perfil, 2.75 para capa)
    onCrop: (croppedFile: File) => void;
    onCancel: () => void;
}

export function ImageCropper({ imageSrc, circular = false, aspectRatio, onCrop, onCancel }: ImageCropperProps) {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const dragStart = useRef({ x: 0, y: 0 });
    const pinchStartDist = useRef<number | null>(null);
    const pinchStartZoom = useRef(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Resetar zoom e posição ao trocar de imagem
    useEffect(() => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    }, [imageSrc]);

    // Handlers para arrastar com Mouse
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;
        setOffset({ x: newX, y: newY });
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    // Helpers para pinch
    const getPinchDist = (touches: React.TouchList) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    };

    // Handlers para arrastar com Toque (Celular)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Início do pinch
            setIsDragging(false);
            pinchStartDist.current = getPinchDist(e.touches);
            pinchStartZoom.current = zoom;
            return;
        }
        if (e.touches.length !== 1) return;
        setIsDragging(true);
        const touch = e.touches[0];
        dragStart.current = { x: touch.clientX - offset.x, y: touch.clientY - offset.y };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current !== null) {
            // Pinch-to-zoom
            const dist = getPinchDist(e.touches);
            const scale = dist / pinchStartDist.current;
            const newZoom = Math.min(3, Math.max(1, pinchStartZoom.current * scale));
            setZoom(newZoom);
            return;
        }
        if (!isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const newX = touch.clientX - dragStart.current.x;
        const newY = touch.clientY - dragStart.current.y;
        setOffset({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
        pinchStartDist.current = null;
        setIsDragging(false);
    };

    const handleCropConfirm = () => {
        if (!imgRef.current || !containerRef.current) return;

        const image = imgRef.current;
        const container = containerRef.current;

        // Dimensões do quadrado/retângulo de corte na tela
        const cropWidth = circular ? 220 : 280;
        const cropHeight = circular ? 220 : Math.round(280 / aspectRatio);

        // Coordenadas centrais da caixa de corte no container de visualização
        const containerRect = container.getBoundingClientRect();
        const cropLeft = (containerRect.width - cropWidth) / 2;
        const cropTop = (containerRect.height - cropHeight) / 2;

        // Imagem renderizada na tela
        const imgRect = image.getBoundingClientRect();

        // Posição renderizada da imagem relativa ao container (com offset e zoom)
        // Por padrão, a imagem é centralizada no container flex
        const rx = (containerRect.width - imgRect.width) / 2 + offset.x;
        const ry = (containerRect.height - imgRect.height) / 2 + offset.y;

        // Mapeamento proporcional da caixa de corte em relação à imagem renderizada
        const relativeLeft = (cropLeft - rx) / imgRect.width;
        const relativeTop = (cropTop - ry) / imgRect.height;
        const relativeWidth = cropWidth / imgRect.width;
        const relativeHeight = cropHeight / imgRect.height;

        // Criação do canvas com resolução de alta qualidade (400x400 para perfil, 1200x436 para capa)
        const canvas = document.createElement('canvas');
        canvas.width = circular ? 400 : 1200;
        canvas.height = circular ? 400 : Math.round(1200 / aspectRatio);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Coordenadas reais na imagem original (naturalWidth/naturalHeight)
        const sx = relativeLeft * image.naturalWidth;
        const sy = relativeTop * image.naturalHeight;
        const sw = relativeWidth * image.naturalWidth;
        const sh = relativeHeight * image.naturalHeight;

        ctx.drawImage(
            image,
            sx, sy, sw, sh,              // Origem na imagem natural
            0, 0, canvas.width, canvas.height // Destino no canvas
        );

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const file = new File([blob], circular ? 'profile.jpg' : 'cover.jpg', {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    onCrop(file);
                }
            },
            'image/jpeg',
            0.9
        );
    };

    // Dimensões dinâmicas do corte visual
    const cropWidth = circular ? 220 : 280;
    const cropHeight = circular ? 220 : Math.round(280 / aspectRatio);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/95 text-white animate-in fade-in duration-300">
            {/* Cabeçalho */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/40 backdrop-blur-md">
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-white/10 active:scale-95 rounded-full transition-all text-gray-400 hover:text-white"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <h2 className="text-base font-bold tracking-tight">
                    {circular ? 'Ajustar Foto de Perfil' : 'Ajustar Foto de Capa'}
                </h2>
                <div className="w-9" /> {/* Espaçador para centralizar título */}
            </div>

            {/* Container de Visualização e Corte */}
            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex-1 w-full overflow-hidden relative bg-neutral-950 flex items-center justify-center cursor-move touch-none"
            >
                {/* Imagem que será arrastada/redimensionada */}
                <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Editar"
                    className="max-w-none pointer-events-none select-none"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                        maxHeight: '70%',
                        maxWidth: '90%',
                    }}
                />

                {/* Máscara de enquadramento centralizada */}
                <div
                    className="absolute pointer-events-none select-none border border-white/40 shadow-inner"
                    style={{
                        width: `${cropWidth}px`,
                        height: `${cropHeight}px`,
                        borderRadius: circular ? '9999px' : '12px',
                        boxShadow: '0 0 0 9999px rgba(10, 10, 10, 0.75)',
                    }}
                />
            </div>

            {/* Controles do Cropper */}
            <div className="p-6 flex flex-col gap-6 bg-neutral-950 border-t border-neutral-900 pb-8">
                {/* Controles de Zoom */}
                <div className="flex items-center gap-4 max-w-md mx-auto w-full">
                    <button
                        onClick={() => setZoom(prev => Math.max(1, prev - 0.1))}
                        className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-lg hover:bg-neutral-800 active:scale-90 select-none"
                    >
                        -
                    </button>
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none"
                    />
                    <button
                        onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                        className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-lg hover:bg-neutral-800 active:scale-90 select-none"
                    >
                        +
                    </button>
                </div>

                {/* Ações */}
                <div className="flex gap-3 max-w-md mx-auto w-full">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 bg-neutral-900 hover:bg-neutral-800 active:scale-95 border border-neutral-800 text-gray-300 hover:text-white rounded-xl font-bold text-sm transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCropConfirm}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-95 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-purple-950/20"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}
