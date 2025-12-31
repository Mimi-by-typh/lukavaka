// Database wrapper - chooses between GitHub and local storage

if (process.env.GITHUB_TOKEN) {
    console.log('✅ Using GitHub storage');
    module.exports = require('./github-db');
} else {
    console.log('⚠️ Using local/KV storage (GITHUB_TOKEN not set)');
    module.exports = require('./db-local');
}
