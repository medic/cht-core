const moduleAlias = require('module-alias');
const path = require('path');

moduleAlias.addAlias('@utils', path.join(__dirname, 'utils'));
moduleAlias.addAlias('@page-objects', path.join(__dirname, 'page-objects'));
moduleAlias.addAlias('@factories', path.join(__dirname, 'factories'));
moduleAlias();
