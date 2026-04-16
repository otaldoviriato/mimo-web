import { io, Socket } from 'socket.io-client';

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';

class SocketService {
    public socket: Socket | null = null;
    private _currentUserId: string | null = null;

    connect(userId?: string) {
        const newUserId = userId ?? this._currentUserId;

        // Já está conectado com o mesmo usuário — não faz nada
        if (this.socket?.connected && this._currentUserId === newUserId) {
            console.log('[SocketService] Já conectado como', newUserId, '— reutilizando socket');
            return;
        }

        // Troca de usuário com socket ativo — desconecta e reconecta
        if (this.socket) {
            console.log('[SocketService] Desconectando socket anterior...');
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
        });

        this.socket.on('connect_error', (err) => {
            console.error('[SocketService] Erro de conexão:', err.message);
        });
    }

    disconnect() {
        if (this.socket) {
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

    sendMessage(content: string, toUserId: string, roomId: string) {
        if (!this.socket) return;
        this.socket.emit('send_message', {
            content,
            receiverId: toUserId,
            roomId,
        });
    }

    onNewMessage(callback: (message: any) => void) {
        if (!this.socket) return;
        this.socket.on('new_message', callback);
    }

    onError(callback: (error: { message: string }) => void) {
        if (!this.socket) return;
        this.socket.on('error', callback);
    }

    offNewMessage() {
        if (!this.socket) return;
        this.socket.off('new_message');
    }

    offError() {
        if (!this.socket) return;
        this.socket.off('error');
    }
}

export const socketService = new SocketService();
