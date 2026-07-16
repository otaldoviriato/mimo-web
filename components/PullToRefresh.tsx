'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<any> | any;
    children: React.ReactNode;
    className?: string;
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const startY = useRef(0);
    const isPulling = useRef(false);
    const threshold = 70; // distância em px necessária para disparar
    const maxPull = 120; // distância máxima de tração

    const handleTouchStart = (e: TouchEvent) => {
        if (!containerRef.current) return;
        
        // O pull to refresh deve iniciar apenas se o container estiver no topo do scroll
        if (containerRef.current.scrollTop <= 0 && !refreshing) {
            startY.current = e.touches[0].pageY;
            isPulling.current = true;
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isPulling.current || !containerRef.current || refreshing) return;
        
        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;
        
        if (diff > 0) {
            // Aplica uma resistência/amortecimento
            const resistance = 0.4;
            const distance = Math.min(diff * resistance, maxPull);
            setPullDistance(distance);
            
            // Previne o comportamento padrão (ex: bounce do Safari/Chrome)
            if (e.cancelable) {
                e.preventDefault();
            }
        } else {
            isPulling.current = false;
            setPullDistance(0);
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling.current) return;
        isPulling.current = false;
        
        if (pullDistance >= threshold) {
            setRefreshing(true);
            setPullDistance(threshold);
            try {
                await onRefresh();
            } catch (err) {
                console.error('Erro ao recarregar:', err);
            } finally {
                setTimeout(() => {
                    setRefreshing(false);
                    setPullDistance(0);
                }, 400);
            }
        } else {
            setPullDistance(0);
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const options = { passive: false };

        container.addEventListener('touchstart', handleTouchStart as any, options);
        container.addEventListener('touchmove', handleTouchMove as any, options);
        container.addEventListener('touchend', handleTouchEnd as any, options);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart as any);
            container.removeEventListener('touchmove', handleTouchMove as any);
            container.removeEventListener('touchend', handleTouchEnd as any);
        };
    }, [pullDistance, refreshing, onRefresh]);

    const rotation = Math.min(180, (pullDistance / threshold) * 180);
    const opacity = Math.min(1, pullDistance / threshold);

    return (
        <div 
            ref={containerRef} 
            className={`relative flex-1 overflow-y-auto overflow-x-hidden flex flex-col ${className}`}
            style={{
                WebkitOverflowScrolling: 'touch',
            }}
        >
            {/* Indicador de Refresh flutuante */}
            <div 
                className="absolute left-1/2 z-50 flex items-center justify-center bg-white rounded-full shadow-lg border border-purple-100 pointer-events-none transition-all duration-150"
                style={{
                    top: `${pullDistance - 50}px`,
                    width: '40px',
                    height: '40px',
                    opacity: refreshing ? 1 : opacity,
                    transform: `translateX(-50%) scale(${refreshing ? 1 : Math.min(1, pullDistance / 40)})`,
                    boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
                }}
            >
                {refreshing ? (
                    <Loader2 className="w-5.5 h-5.5 text-purple-600 animate-spin" />
                ) : (
                    <ArrowDown 
                        className="w-5 h-5 text-purple-600 transition-transform duration-75"
                        style={{ transform: `rotate(${rotation}deg)` }}
                    />
                )}
            </div>

            {/* Conteúdo deslocado levemente ao puxar */}
            <div 
                className="flex-1 flex flex-col transition-transform duration-150"
                style={{
                    transform: refreshing ? `translateY(${threshold}px)` : `translateY(${pullDistance}px)`,
                }}
            >
                {children}
            </div>
        </div>
    );
}
