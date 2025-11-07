const { spacesUploadMiddleware } = require('../../utils/spaces');
// Use a prefix per module for organization
module.exports = { single: (field) => spacesUploadMiddleware(field, { maxCount: 1, prefix: 'kanban' }) };
