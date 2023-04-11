const moduleAlias = require('module-alias');
const path = require('path');
const jsonConfig = require('./jsconfig.json');

const pathCleanupRe = /^.\/|\/\*$/g;
Object.entries(jsonConfig.compilerOptions.paths).forEach(([alias, [relative]]) => {
  alias = alias.replace(pathCleanupRe, '');
  relative = relative.replace(pathCleanupRe, '');
  moduleAlias.addAlias(alias, path.join(__dirname, relative));
});
moduleAlias();
