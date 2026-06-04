'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, MessageSquare, Users as UsersIcon } from 'lucide-react';

interface DataPoint {
    label: string;
    messages: number;
    users: number;
}

const data: DataPoint[] = [
    { label: 'Seg', messages: 4200, users: 95 },
    { label: 'Ter', messages: 5100, users: 120 },
    { label: 'Qua', messages: 4800, users: 105 },
    { label: 'Qui', messages: 6300, users: 145 },
    { label: 'Sex', messages: 7100, users: 170 },
    { label: 'Sáb', messages: 5900, users: 130 },
    { label: 'Dom', messages: 8200, users: 215 },
];

export function ActivityChart() {
    const [activeMetric, setActiveMetric] = useState<'messages' | 'users'>('messages');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Dimensões do SVG
    const width = 600;
    const height = 240;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Valores calculados
    const maxVal = useMemo(() => {
        const values = data.map(d => d[activeMetric]);
        const max = Math.max(...values);
        // Arredonda para cima para uma linha de grade limpa
        return Math.ceil(max / 100) * 100;
    }, [activeMetric]);

    const points = useMemo(() => {
        const stepX = chartWidth / (data.length - 1);
        return data.map((d, i) => {
            const x = paddingLeft + i * stepX;
            const val = d[activeMetric];
            const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
            return { x, y, val, label: d.label };
        });
    }, [activeMetric, maxVal, chartWidth, chartHeight]);

    // String de caminho para a linha SVG
    const linePath = useMemo(() => {
        if (points.length === 0) return '';
        return points.reduce((path, pt, i) => {
            return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
        }, '');
    }, [points]);

    // String de caminho para o gradiente de preenchimento abaixo da linha
    const areaPath = useMemo(() => {
        if (points.length === 0) return '';
        const startX = points[0].x;
        const endX = points[points.length - 1].x;
        const bottomY = paddingTop + chartHeight;
        return `${linePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
    }, [points, linePath, paddingTop, chartHeight]);

    return (
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col h-full">
            {/* Header do Gráfico */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <TrendingUp size={20} className="text-purple-600" />
                        Desempenho da Plataforma
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Atividade geral de tráfego nos últimos 7 dias.
                    </p>
                </div>

                {/* Seletor de Métrica */}
                <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
                    <button
                        onClick={() => setActiveMetric('messages')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                            activeMetric === 'messages'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <MessageSquare size={13} />
                        Mensagens
                    </button>
                    <button
                        onClick={() => setActiveMetric('users')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                            activeMetric === 'users'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <UsersIcon size={13} />
                        Novos Usuários
                    </button>
                </div>
            </div>

            {/* Gráfico SVG */}
            <div className="relative flex-1 min-h-[220px]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" style={{ overflow: 'visible' }}>
                    <defs>
                        {/* Gradiente Roxo */}
                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Linhas de Grade e Rótulos Y */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = paddingTop + ratio * chartHeight;
                        const labelValue = Math.round(maxVal * (1 - ratio));
                        return (
                            <g key={i} className="opacity-40">
                                <line
                                    x1={paddingLeft}
                                    y1={y}
                                    x2={width - paddingRight}
                                    y2={y}
                                    stroke="#E2E8F0"
                                    strokeDasharray="4 4"
                                    strokeWidth={1}
                                />
                                <text
                                    x={paddingLeft - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fill="#64748B"
                                    className="text-[10px] font-bold"
                                >
                                    {labelValue.toLocaleString('pt-BR')}
                                </text>
                            </g>
                        );
                    })}

                    {/* Área Preenchida */}
                    <path d={areaPath} fill="url(#purpleGradient)" className="transition-all duration-300" />

                    {/* Linha Principal */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-300"
                    />

                    {/* Rótulos X */}
                    {points.map((pt, i) => (
                        <text
                            key={i}
                            x={pt.x}
                            y={height - 15}
                            textAnchor="middle"
                            fill="#64748B"
                            className="text-[10px] font-bold"
                        >
                            {pt.label}
                        </text>
                    ))}

                    {/* Pontos de Interação */}
                    {points.map((pt, i) => (
                        <g 
                            key={i} 
                            onMouseEnter={() => setHoveredIndex(i)} 
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="cursor-pointer group"
                        >
                            {/* Círculo invisível maior para facilitar hover */}
                            <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={12}
                                fill="transparent"
                            />
                            {/* Ponto Visual */}
                            <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={hoveredIndex === i ? 6 : 4}
                                fill={hoveredIndex === i ? '#8B5CF6' : '#FFFFFF'}
                                stroke="#8B5CF6"
                                strokeWidth={hoveredIndex === i ? 3 : 2}
                                className="transition-all duration-150"
                            />
                        </g>
                    ))}
                </svg>

                {/* Tooltip HTML Posicionado */}
                {hoveredIndex !== null && points[hoveredIndex] && (
                    <div
                        className="absolute bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg border border-slate-800 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-150 animate-fade-in"
                        style={{
                            left: `${(points[hoveredIndex].x / width) * 100}%`,
                            top: `${(points[hoveredIndex].y / height) * 100 - 4}%`,
                        }}
                    >
                        <div className="text-[10px] text-slate-400 font-medium mb-0.5">
                            {points[hoveredIndex].label}
                        </div>
                        <div className="flex items-center gap-1 text-purple-300 font-bold">
                            {activeMetric === 'messages' ? '💬' : '👤'}{' '}
                            {points[hoveredIndex].val.toLocaleString('pt-BR')}{' '}
                            <span className="text-[10px] text-white/80 font-normal">
                                {activeMetric === 'messages' ? 'mensagens' : 'cadastros'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
