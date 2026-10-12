const path = require('node:path');
module.exports = {
    devIndicators: false,
    images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }] },
    webpack(config) {
        config.resolve.alias['@clerk/nextjs$'] = path.join(__dirname, 'clerk.ts');
        config.resolve.alias['@clerk/nextjs/legacy$'] = path.join(__dirname, 'clerk.ts');
        return config;
    },
};
