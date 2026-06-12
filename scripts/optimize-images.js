const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'public', 'assets');
const publicDir = path.join(__dirname, '..', 'public');

const avatars = [
    'bruno.png',
    'carlos.png',
    'diego.png',
    'edmilson.png',
    'gabriela.png',
    'helena.png',
    'isabella.png',
    'juliana.png',
    'laura.png',
    'mateus.png',
    'rafael.png'
];

async function optimizeAvatars() {
    console.log('Iniciando otimização dos avatares...');
    for (const file of avatars) {
        const filePath = path.join(assetsDir, file);
        if (fs.existsSync(filePath)) {
            const tempPath = path.join(assetsDir, `temp_${file}`);
            
            try {
                // Redimensiona o avatar para 128x128 e aplica compressão PNG
                await sharp(filePath)
                    .resize(128, 128, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .png({ compressionLevel: 9, quality: 80 })
                    .toFile(tempPath);
                
                // Substitui o original pelo otimizado
                fs.unlinkSync(filePath);
                fs.renameSync(tempPath, filePath);
                
                const stats = fs.statSync(filePath);
                console.log(`✓ Otimizado: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
            } catch (err) {
                console.error(`Erro ao otimizar ${file}:`, err);
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }
        } else {
            console.log(`Arquivo não encontrado: ${file}`);
        }
    }
}

async function optimizeGift() {
    const giftPath = path.join(assetsDir, 'gift.png');
    if (fs.existsSync(giftPath)) {
        const tempPath = path.join(assetsDir, 'temp_gift.png');
        try {
            console.log('Otimizando gift.png...');
            await sharp(giftPath)
                .resize(256, 256, {
                    fit: 'inside'
                })
                .png({ compressionLevel: 9, quality: 80 })
                .toFile(tempPath);
            
            fs.unlinkSync(giftPath);
            fs.renameSync(tempPath, giftPath);
            const stats = fs.statSync(giftPath);
            console.log(`✓ Otimizado: gift.png (${(stats.size / 1024).toFixed(2)} KB)`);
        } catch (err) {
            console.error('Erro ao otimizar gift.png:', err);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }
}

async function optimizeNotificationBadge() {
    const badgePath = path.join(publicDir, 'notification-badge.png');
    if (fs.existsSync(badgePath)) {
        const tempPath = path.join(publicDir, 'temp_notification-badge.png');
        try {
            console.log('Otimizando notification-badge.png...');
            await sharp(badgePath)
                .resize(256, 256, {
                    fit: 'inside'
                })
                .png({ compressionLevel: 9, quality: 80 })
                .toFile(tempPath);
            
            fs.unlinkSync(badgePath);
            fs.renameSync(tempPath, badgePath);
            const stats = fs.statSync(badgePath);
            console.log(`✓ Otimizado: notification-badge.png (${(stats.size / 1024).toFixed(2)} KB)`);
        } catch (err) {
            console.error('Erro ao otimizar notification-badge.png:', err);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }
}

async function run() {
    await optimizeAvatars();
    await optimizeGift();
    await optimizeNotificationBadge();
    console.log('Concluído!');
}

run();
