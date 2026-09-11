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
    private _getToken: (() => Promise<string | null>) | null = null;

    private _connectionListeners = new Set<(connected: boolean) => void>();
    private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    public isConnected(): boolean {
        return !!this.socket?.connected;
    }

    public onConnectionChange(listener: (connected: boolean) => void): () => void {
        this._connectionListeners.add(listener);
        listener(this.isConnected());
        return () => {
            this._connectionListeners.delete(listener);
        };
    }

    private _notifyConnectionChange(connected: boolean) {
        for (const listener of this._connectionListeners) {
            try {
                listener(connected);
            } catch (err) {
                console.error('[SocketService] Erro no listener de conexão:', err);
            }
        }
    }

    // ── Detecção de sessão ──────────────────────────────────────────────────

    private _markSessionEnded(intentional: boolean) {
        if (typeof window === 'undefined') return;
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
            isNewSession = true;
        } else if (wasIntentional) {
            isNewSession = true;
        } else if (sessionEndedStr) {
            isNewSession = now - Number(sessionEndedStr) > 2 * 60 * 1000;
        }

        localStorage.removeItem(SESSION_KEYS.intentional);
        localStorage.removeItem(SESSION_KEYS.sessionEnded);
        localStorage.setItem(SESSION_KEYS.everConnected, '1');

        if (isNewSession) {
            localStorage.setItem(SESSION_KEYS.newSession, wasIntentional ? 'intentional' : '1');
            window.dispatchEvent(
                new CustomEvent(NEW_SESSION_EVENT, { detail: { intentional: wasIntentional } })
            );
        }
    }

    connect(userId?: string, getToken?: () => Promise<string | null>) {
        const newUserId = userId ?? this._currentUserId;
        if (getToken) this._getToken = getToken;

        if (this._currentUserId && newUserId && this._currentUserId === newUserId && this.socket) {
            if (this.socket.connected) {
                this._notifyConnectionChange(true);
                return;
            }
            if (!this.socket.disconnected) {
                return;
            }
            this.socket.connect();
            return;
        }

        if (this.socket) {
            this._markSessionEnded(true);
            this.socket.disconnect();
            this.socket = null;
            this._notifyConnectionChange(false);
        }

        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }

        if (newUserId) {
            this._currentUserId = newUserId;
        }

        this.socket = io(CHAT_SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            autoConnect: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            auth: async (callback) => {
                let token: string | null = null;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        token = (await this._getToken?.()) ?? null;
                        if (token) break;
                    } catch {
                        token = null;
                    }
                    if (!token && attempt < 2) {
                        await new Promise((resolve) => setTimeout(resolve, 250));
                    }
                }
                callback({ token });
            },
        });

        this.socket.on('connect', () => {
            this._onSocketConnected();
            this._notifyConnectionChange(true);
            if (this._reconnectTimer) {
                clearTimeout(this._reconnectTimer);
                this._reconnectTimer = null;
            }
        });

        this.socket.on('disconnect', () => {
            this._markSessionEnded(false);
            this._notifyConnectionChange(false);
        });

        this.socket.on('connect_error', (err) => {
            console.warn('[SocketService] Erro de conexão:', err.message);
            this._notifyConnectionChange(false);

            if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
            this._reconnectTimer = setTimeout(() => {
                if (this.socket && !this.socket.connected) {
                    this.socket.connect();
                }
            }, 1500);
        });
    }

    disconnect() {
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        if (this.socket) {
            this._markSessionEnded(true);
            this.socket.disconnect();
            this.socket = null;
            this._notifyConnectionChange(false);
        }
        this._currentUserId = null;
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

    private _ackResolvers = new Map<string, (result: { success: boolean; error?: string }) => void>();

    private _setupAckListeners() {
        if (!this.socket) return;
        this.socket.off('message_ack');
        this.socket.on('message_ack', (data: { tempId?: string; success: boolean; error?: string }) => {
            if (data?.tempId && this._ackResolvers.has(data.tempId)) {
                const resolve = this._ackResolvers.get(data.tempId);
                this._ackResolvers.delete(data.tempId);
                resolve?.(data);
            }
        });
        this.socket.off('message_error');
        this.socket.on('message_error', (data: { tempId?: string; error: string }) => {
            if (data?.tempId && this._ackResolvers.has(data.tempId)) {
                const resolve = this._ackResolvers.get(data.tempId);
                this._ackResolvers.delete(data.tempId);
                resolve?.({ success: false, error: data.error });
            }
        });
    }

    waitForAck(tempId: string, timeoutMs = 2500): Promise<{ success: boolean; error?: string }> {
        if (!this.socket || !tempId) {
            return Promise.resolve({ success: true });
        }
        this._setupAckListeners();

        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                if (this._ackResolvers.has(tempId)) {
                    this._ackResolvers.delete(tempId);
                    // Fallback para não travar a fila em caso de lag transitório
                    resolve({ success: true });
                }
            }, timeoutMs);

            this._ackResolvers.set(tempId, (result) => {
                clearTimeout(timer);
                resolve(result);
            });
        });
    }

    offError() {
        if (!this.socket) return;
        this.socket.off('error');
    }
}

export const socketService = new SocketService();
