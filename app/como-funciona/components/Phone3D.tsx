'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Phone3DProps {
    children: React.ReactNode;
    isMobile?: boolean;
    distanceFactor?: number; // Mantido por compatibilidade de assinatura
    isFacingFront?: boolean;
    onLoad?: () => void;
}

export default function Phone3D({ children, isMobile = false, isFacingFront = false, onLoad }: Phone3DProps) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Efeito para disparar onLoad após a montagem
    useEffect(() => {
        if (onLoad) {
            const timer = setTimeout(() => {
                onLoad();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [onLoad]);

    // Efeito de Parallax suave baseado na posição do mouse na tela
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            
            // Calcula a posição do mouse em relação ao centro da janela
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Valores normalizados de -1 a 1
            const x = (e.clientX - centerX) / centerX;
            const y = (e.clientY - centerY) / centerY;
            
            setMousePos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Movimentação do mouse muito reduzida para micro-movimentos discretos e suaves
    // Se isFacingFront for true, o celular fica de frente (Z=0, X=0, Y=0) com micro-parallax sutil
    const rotateY = isFacingFront
        ? (mousePos.x * 1.8)
        : (-20 + mousePos.x * 2.5);
    const rotateX = isFacingFront
        ? (mousePos.y * 1.5)
        : (12 - mousePos.y * 2.0);
    const rotateZ = isFacingFront ? 0 : 5;

    // Dimensões do celular: esguio no Passo 0 (mobile) e mais largo/curto (aspecto quadrado) nos Passos 1-3 (mobile)
    // No desktop: mantém o padrão 260px x 506px
    const width = isMobile 
        ? (isFacingFront ? '300px' : '170px') 
        : '260px';
    const height = isMobile 
        ? (isFacingFront ? '325px' : '330px') 
        : '506px';

    // Contêiner com tamanho estático no mobile para evitar reflow do grid geral da página
    const containerWidth = isMobile ? '320px' : '350px';
    const containerHeight = isMobile ? '340px' : '560px';

    // Escala sempre 1.0 (sem encolhimento de fontes/zoom out)
    const scale = 1.0;

    // Número de camadas voxel CSS 3D dinâmico: 7 no mobile (performance superior) e 17 no desktop
    const layersCount = isMobile ? 7 : 17;

    return (
        <div 
            ref={containerRef}
            className="relative flex items-center justify-center select-none transition-all duration-850 ease-out"
            style={{ 
                perspective: '1200px',
                width: containerWidth,
                height: containerHeight,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'visible'
            }}
        >
            {/* Contêiner Geral do Celular 3D com Preservação de Espaço Tridimensional */}
            <div
                style={{
                    width: width,
                    height: height,
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transform: `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
                    transition: 'transform 0.85s cubic-bezier(0.19, 1, 0.22, 1), width 0.85s cubic-bezier(0.19, 1, 0.22, 1), height 0.85s cubic-bezier(0.19, 1, 0.22, 1)',
                }}
            >
                {/* ─── CHASSI METÁLICO 3D (EMPILHAMENTO DE CAMADAS EM Z - VOXELS CSS) ─── */}
                {/* Criamos uma pilha de camadas voxel tridimensionais (layersCount) */}
                {[...Array(layersCount)].map((_, i) => {
                    // Distribui as camadas uniformemente de Z = -8px a Z = 8px
                    const zOffset = layersCount === 7
                        ? (-8 + i * 2.66)
                        : (i - 8);
                    
                    const isOuter = layersCount === 7
                        ? (i === 0 || i === 6)
                        : (i === 0 || i === 1 || i === 15 || i === 16);
                        
                    const borderColor = isOuter ? '#f8fafc' : '#cbd5e1';
                    
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                inset: '0',
                                borderRadius: isMobile ? '1.3rem' : '2.0rem',
                                border: `3.0px solid ${borderColor}`,
                                background: '#0f172a', // Cor do interior do telefone
                                transform: `translateZ(${zOffset}px)`,
                                pointerEvents: 'none',
                                boxSizing: 'border-box',
                                boxShadow: i === 0 ? 'none' : '0 1px 1px rgba(0, 0, 0, 0.04)',
                                willChange: 'width, height'
                            }}
                        />
                    );
                })}

                {/* Aro externo metálico prateado brilhante (Aço escovado com arredondamento suavizado) */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '-3.0px',
                        borderRadius: isMobile ? '1.5rem' : '2.2rem',
                        border: '3.0px solid #e2e8f0',
                        pointerEvents: 'none',
                        transform: 'translateZ(-1px)',
                        boxSizing: 'border-box'
                    }}
                />

                {/* ─── FACE TRASEIRA (COSTAS DO SMARTPHONE em Z = -9px) ─── */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '0',
                        borderRadius: isMobile ? '1.3rem' : '2.0rem',
                        background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)', // Degradê de metal escovado
                        transform: 'translateZ(-9px) rotateY(180deg)',
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                        border: '3.0px solid #cbd5e1',
                        /* Sombra cinza escura suave de fundo (reduzida drasticamente para não ofuscar o 3D) */
                        boxShadow: `
                            -8px 16px 28px rgba(15, 23, 42, 0.12), 
                            -2px 4px 8px rgba(15, 23, 42, 0.06)
                        `
                    }}
                >
                    {/* Câmera Traseira simulada para compor a traseira do aparelho */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#1e293b',
                            borderRadius: '10px',
                            border: '1.5px solid #64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div className="w-4.5 h-4.5 rounded-full bg-black border border-slate-700" />
                    </div>
                </div>

                {/* ─── BOTÕES FÍSICOS LATERAIS 3D (ESPESSURA DE 8px COMPATÍVEL COM O CHASSI GROSSO) ─── */}
                {/* Botão de Energia na Lateral Direita */}
                <div
                    style={{
                        position: 'absolute',
                        right: '-3.0px',
                        top: '100px',
                        width: '8px', // Aumentado para acompanhar o chassi mais profundo
                        height: '42px',
                        background: '#e2e8f0',
                        borderRadius: '0 2.0px 2.0px 0',
                        transform: 'rotateY(90deg) translateZ(1.5px)',
                        border: '1px solid #cbd5e1',
                        boxSizing: 'border-box'
                    }}
                />

                {/* Botão de Volume + (Esquerda) */}
                <div
                    style={{
                        position: 'absolute',
                        left: '-3.0px',
                        top: '90px',
                        width: '8px',
                        height: '28px',
                        background: '#e2e8f0',
                        borderRadius: '2.0px 0 0 2.0px',
                        transform: 'rotateY(-90deg) translateZ(1.5px)',
                        border: '1px solid #cbd5e1',
                        boxSizing: 'border-box'
                    }}
                />

                {/* Botão de Volume - (Esquerda) */}
                <div
                    style={{
                        position: 'absolute',
                        left: '-3.0px',
                        top: '125px',
                        width: '8px',
                        height: '28px',
                        background: '#e2e8f0',
                        borderRadius: '2.0px 0 0 2.0px',
                        transform: 'rotateY(-90deg) translateZ(1.5px)',
                        border: '1px solid #cbd5e1',
                        boxSizing: 'border-box'
                    }}
                />

                {/* ─── FACE FRONTAL DO CELULAR (TELA E BEZEL em Z = 9px) ─── */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '0',
                        borderRadius: isMobile ? '1.3rem' : '2.0rem',
                        background: '#090d16', // Moldura preta do bezel
                        padding: '4px', // Afinada a borda preta (bezel) de 8px para apenas 4px
                        boxSizing: 'border-box',
                        transform: 'translateZ(9px)',
                        transformStyle: 'preserve-3d'
                    }}
                >

                    {/* Tela física do display (onde o layout de chat roda) */}
                    <div
                        className="bg-white"
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: isMobile ? '0.9rem' : '1.6rem',
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {children}
                    </div>
                </div>

            </div>
        </div>
    );
}
