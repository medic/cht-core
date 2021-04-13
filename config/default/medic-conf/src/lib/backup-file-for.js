const fs = require('./sync-fs');

module.exports = (projectDir, originalFileName) => {
  const dir = `${projectDir}/backups`;
  fs.mkdir(dir);
  return `${dir}/${originalFileName}.${Date.now()}.bak`;
};
