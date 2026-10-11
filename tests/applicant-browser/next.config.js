const path = require('node:path');
module.exports = { webpack(config) { config.resolve.alias['@clerk/nextjs$'] = path.join(__dirname, 'clerk.ts'); return config; } };
