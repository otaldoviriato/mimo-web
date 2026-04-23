import axios from 'axios';

// No Next.js, as rotas /api/* são servidas pelo próprio app.
// Usamos path relativo (sem baseURL) para que o browser envie os cookies
// de sessão do Clerk corretamente e evitar problemas de CORS/IP.
export const api = axios.create({
    baseURL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
    timeout: 10000,
    withCredentials: true,
});

export const setupAxiosInterceptors = (getToken: () => Promise<string | null>) => {
    // @ts-ignore - clear previous handlers to avoid duplicates
    if (api.interceptors.request.handlers) {
        // @ts-ignore
        api.interceptors.request.handlers = [];
    }

    api.interceptors.request.use(
        async (config) => {
            try {
                const token = await getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error('[Axios Interceptor] Failed to get token', error);
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
};

export const userApi = {
    getMe: async () => {
        const response = await api.get('/api/users/me');
        return response.data;
    },

    updateMe: async (data: {
        username?: string;
        name?: string;
        taxId?: string;
        phone?: string;
        photoUrl?: string;
        isProfessional?: boolean;
        subscriptionPrice?: number;
        chargePerCharSubscribers?: number;
        chargePerCharNonSubscribers?: number;
        pixKey?: string;
    }) => {
        const response = await api.patch('/api/users/me', data);
        return response.data;
    },

    addBalance: async (amount: number) => {
        const response = await api.post('/api/users/me/balance', { amount });
        return response.data;
    },

    generatePix: async (amount: number) => {
        const response = await api.post('/api/users/me/balance/pix', { amount });
        return response.data;
    },

    checkPixStatus: async (transactionId: string) => {
        const response = await api.get(`/api/users/me/balance/pix/${transactionId}?t=${Date.now()}`);
        return response.data;
    },

    searchByUsername: async (username: string) => {
        const encoded = encodeURIComponent(username);
        const response = await api.get(`/api/users/search?username=${encoded}`);
        return response.data;
    },

    getUserById: async (userId: string) => {
        const response = await api.get(`/api/users/${userId}`);
        return response.data;
    },

    uploadPhoto: async (formData: FormData) => {
        const response = await api.post('/api/users/me/photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    addCard: async (data: { label: string; lastFour: string; brand: string }) => {
        const response = await api.post('/api/users/me/cards', data);
        return response.data;
    },

    removeCard: async (cardId: string) => {
        const response = await api.delete('/api/users/me/cards', { data: { cardId } });
        return response.data;
    },

    savePushToken: async (fcmToken: string) => {
        const response = await api.post('/api/users/push-token', { fcmToken });
        return response.data;
    },

    requestWithdraw: async () => {
        const response = await api.post('/api/withdraw');
        return response.data;
    },

    getPendingWithdrawal: async () => {
        const response = await api.get('/api/withdraw');
        return response.data;
    },
};
