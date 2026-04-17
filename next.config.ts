import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
    experimental: {
        serverActions: {
            allowedOrigins: ['600b-2804-214-4013-93-54ba-643a-6b9c-d856.ngrok-free.app'],
            bodySizeLimit: '50mb',
        }
    },
};

export default nextConfig;
