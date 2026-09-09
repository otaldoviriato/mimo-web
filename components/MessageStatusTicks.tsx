import React from 'react';

export interface MessageStatusTicksProps {
    status?: 'sending' | 'sent' | 'error';
    isRead?: boolean;
    isDelivered?: boolean;
    onRetry?: (e: React.MouseEvent) => void;
    /** Classe adicional opcional para o wrapper */
    className?: string;
}

/**
 * Componente oficial de ticks/status das mensagens de chat.
 * 
 * Regra de Monotonicidade de Estado:
 * O estado de uma mensagem segue uma hierarquia estritamente crescente:
 *   0. sending (relógio)
 *   1. sent (1 check cinza/roxo)
 *   2. delivered (2 checks cinza/roxo)
 *   3. read (2 checks azuis)
 * 
 * Se uma mensagem atinge o nível superior (ex: read ou delivered),
 * esse nível SOBRESCREVE qualquer estado anterior, impossibilitando
 * anomalias visuais como "relógio azul" ou regressão para "enviando".
 */
export const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({
    status,
    isRead,
    isDelivered,
    onRetry,
    className = '',
}) => {
    // 1. Nível 3 (Máximo): Mensagem foi visualizada/lida pelo destinatário.
    // Sobrescreve TUDO (entregue, enviada, enviando). Sempre 2 checks azuis.
    if (isRead) {
        return (
            <span
                className={`text-[11px] text-blue-300 inline-flex items-center select-none ${className}`}
                title="Visualizada"
            >
                <span className="relative leading-none">✓</span>
                <span className="relative -ml-1.5 leading-none">✓</span>
            </span>
        );
    }

    // 2. Nível 2: Mensagem entregue no dispositivo do destinatário.
    // Sobrescreve 'sending' e 'sent'. Sempre 2 checks normais.
    if (isDelivered) {
        return (
            <span
                className={`text-[11px] text-purple-300/80 inline-flex items-center select-none ${className}`}
                title="Entregue"
            >
                <span className="relative leading-none">✓</span>
                <span className="relative -ml-1.5 leading-none">✓</span>
            </span>
        );
    }

    // 3. Estado de Erro de Envio
    if (status === 'error') {
        return onRetry ? (
            <button
                type="button"
                onClick={onRetry}
                className={`inline-flex items-center gap-0.5 text-red-300 hover:text-white cursor-pointer ${className}`}
                title="Falha ao enviar. Clique para tentar novamente."
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </button>
        ) : (
            <span className={`inline-flex items-center gap-0.5 text-red-300 ${className}`} title="Falha ao enviar">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </span>
        );
    }

    // 4. Nível 0: Somente se status for 'sending' E NÃO for lida, NEM entregue
    // O relógio é estritamente roxo pulsante — NUNCA azul.
    if (status === 'sending') {
        return (
            <span
                className={`text-[11px] text-purple-300 animate-pulse inline-flex items-center ${className}`}
                title="Enviando..."
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            </span>
        );
    }

    // 5. Nível 1 (Padrão): Mensagem enviada e recebida pelo servidor (1 check)
    return (
        <span
            className={`text-[11px] text-purple-300/80 inline-flex items-center select-none ${className}`}
            title="Enviada"
        >
            <span className="leading-none">✓</span>
        </span>
    );
};
