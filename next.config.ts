import type { NextConfig } from "next";

import fs from 'fs';
import path from 'path';

const allowedOrigins = ['192.168.1.7:3000'];
const allowedDevOrigins = ['192.168.1.7'];

try {
    const logPath = path.resolve(process.cwd(), '../ngrok_capture.log');
    if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, 'utf8');
        const regex = /name=web\s+addr=http:\/\/localhost:3000\s+url=https:\/\/([a-zA-Z0-9.-]+\.ngrok-free\.app)/;
        const match = logContent.match(regex);
        if (match && match[1]) {
            allowedOrigins.push(match[1]);
            allowedDevOrigins.push(match[1]);
        }
    }
} catch (error) {
    console.error('[NextConfig] Erro ao ler ngrok_capture.log:', error);
}

const nextConfig: NextConfig = {
    allowedDevOrigins: allowedDevOrigins,
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
    experimental: {
        serverActions: {
            allowedOrigins: allowedOrigins,
            bodySizeLimit: '50mb',
        }
    },
};

export default nextConfig;
