const path = require('path');

module.exports.buildPath = path.join(__dirname, '..', 'build');
module.exports.staticPath = path.join(module.exports.buildPath, 'static');
module.exports.webappPath = path.join(module.exports.staticPath, 'webapp');
module.exports.loginPath = path.join(module.exports.staticPath, 'login');
module.exports.templatePath = path.join(__dirname, '..', 'src', 'templates');
module.exports.defaultDocsPath = path.join(module.exports.buildPath, 'default-docs');
module.exports.ddocsPath = path.join(module.exports.buildPath, 'ddocs');
module.exports.resourcesPath = path.join(__dirname, '..', 'resources');
