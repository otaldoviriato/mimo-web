import { io, Socket } from 'socket.io-client';

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';

// Chaves usadas para detecção de sessão (lidas pelos modais de promoção)
export const SESSION_KEYS = {
    newSession:    'mimo_new_session',
    intentional:   'mimo_session_intentional',
    sessionEnded:  'mimo_session_ended',
    everConnected: 'mimo_ever_connected',
} as const;

// Evento customizado disparado quando uma nova sessão é detectada
export const NEW_SESSION_EVENT = 'mimo:new-session';

class SocketService {
    public socket: Socket | null = null;
    private _currentUserId: string | null = null;
    private _newMessageCallback: ((data: any) => void) | null = null;

    // ── Detecção de sessão ──────────────────────────────────────────────────

    private _markSessionEnded(intentional: boolean) {
        if (typeof window === 'undefined') return;
        // Não sobrescreve se já marcado (evita duplo-registro na sequência disconnect→disconnect)
        if (!localStorage.getItem(SESSION_KEYS.sessionEnded)) {
            localStorage.setItem(SESSION_KEYS.sessionEnded, String(Date.now()));
        }
        if (intentional) {
            localStorage.setItem(SESSION_KEYS.intentional, '1');
        }
    }

    private _onSocketConnected() {
        if (typeof window === 'undefined') return;

        const wasIntentional = localStorage.getItem(SESSION_KEYS.intentional) === '1';
        const sessionEndedStr = localStorage.getItem(SESSION_KEYS.sessionEnded);
        const everConnected   = !!localStorage.getItem(SESSION_KEYS.everConnected);

        const now = Date.now();
        let isNewSession = false;

        if (!everConnected) {
            isNewSession = true; // Primeira visita de todos os tempos
        } else if (wasIntentional) {
            isNewSession = true; // Logout ou troca de usuário
        } else if (sessionEndedStr) {
            // Consideramos nova sessão se o socket ficou desconectado > 2 min
            isNewSession = now - Number(sessionEndedStr) > 2 * 60 * 1000;
        }

        // Limpa flags da sessão anterior antes de disparar
        localStorage.removeItem(SESSION_KEYS.intentional);
        localStorage.removeItem(SESSION_KEYS.sessionEnded);
        localStorage.setItem(SESSION_KEYS.everConnected, '1');

        if (isNewSession) {
            // Flag para modais que montarem após este evento
            localStorage.setItem(SESSION_KEYS.newSession, wasIntentional ? 'intentional' : '1');
            window.dispatchEvent(
                new CustomEvent(NEW_SESSION_EVENT, { detail: { intentional: wasIntentional } })
            );
        }
    }

    // ────────────────────────────────────────────────────────────────────────

    connect(userId?: string) {
        const newUserId = userId ?? this._currentUserId;

        // Já está conectado com o mesmo usuário — não faz nada
        if (this.socket?.connected && this._currentUserId === newUserId) {
            console.log('[SocketService] Já conectado como', newUserId, '— reutilizando socket');
            return;
        }

        // Troca de usuário com socket ativo — desconecta e reconecta (intencional)
        if (this.socket) {
            console.log('[SocketService] Desconectando socket anterior...');
            this._markSessionEnded(true);
            this.socket.disconnect();
            this.socket = null;
        }

        if (newUserId) {
            this._currentUserId = newUserId;
        }

        console.log('[SocketService] Conectando ao Chat Server como', newUserId);

        this.socket = io(CHAT_SERVER_URL, {
            transports: ['websocket'],
            reconnection: true,
            autoConnect: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        this.socket.on('connect', () => {
            console.log('[SocketService] Socket conectado! Autenticando como', this._currentUserId);
            if (this._currentUserId) {
                this.authenticate(this._currentUserId);
            }
            this._onSocketConnected();
        });

        this.socket.on('disconnect', () => {
            // Desconexão não-intencional (rede, Chrome matou processo, etc.)
            this._markSessionEnded(false);
        });

        this.socket.on('connect_error', (err) => {
            console.error('[SocketService] Erro de conexão:', err.message);
        });
    }

    disconnect() {
        if (this.socket) {
            this._markSessionEnded(true); // Desconexão explícita (logout)
            this.socket.disconnect();
            this.socket = null;
        }
        this._currentUserId = null;
    }

    authenticate(userId: string) {
        if (!this.socket) return;
        console.log('[SocketService] Emitindo authenticate para', userId);
        this.socket.emit('authenticate', { userId });
    }

    joinRoom(userId: string, targetUserId: string) {
        if (!this.socket) return;
        const roomId = [userId, targetUserId].sort().join('_');
        this.socket.emit('join_room', { roomId, otherUserId: targetUserId });
        return roomId;
    }

    leaveRoom(roomId: string) {
        if (!this.socket) return;
        this.socket.emit('leave_room', { roomId });
        console.log('[SocketService] Saindo da sala', roomId);
    }

    sendMessage(
        content: string,
        toUserId: string,
        roomId: string,
        tempId?: string,
        replyToId?: string,
        replyToContent?: string,
        replyToSenderId?: string
    ) {
        if (!this.socket) return;
        this.socket.emit('send_message', {
            content,
            receiverId: toUserId,
            roomId,
            tempId,
            replyToId,
            replyToContent,
            replyToSenderId,
        });
    }

    deleteRoom(roomId: string) {
        if (!this.socket) return;
        this.socket.emit('delete_room', { roomId });
    }

    onRoomDeleted(callback: (data: { roomId: string }) => void) {
        if (!this.socket) return;
        this.socket.on('room_deleted', callback);
    }

    offRoomDeleted() {
        if (!this.socket) return;
        this.socket.off('room_deleted');
    }

    onNewMessage(callback: (message: any) => void) {
        if (!this.socket) return;
        // Remove o listener anterior antes de registrar um novo
        // para evitar acúmulo de callbacks quando o useEffect re-executa
        if (this._newMessageCallback) {
            this.socket.off('new_message', this._newMessageCallback);
        }
        this._newMessageCallback = callback;
        this.socket.on('new_message', callback);
    }

    onError(callback: (error: { message: string }) => void) {
        if (!this.socket) return;
        this.socket.on('error', callback);
    }

    offNewMessage() {
        if (!this.socket) return;
        if (this._newMessageCallback) {
            this.socket.off('new_message', this._newMessageCallback);
            this._newMessageCallback = null;
        } else {
            this.socket.off('new_message');
        }
    }

    offError() {
        if (!this.socket) return;
        this.socket.off('error');
    }
}

export const socketService = new SocketService();
