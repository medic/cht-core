const fs = require('fs');
const req = require('request');
const {promisify} = require('util');
const get = promisify(req.get);
const pkg = require('../../../package.json');

module.exports = {
  capitalize: (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
  save: async (fileUrl, filePath) => {
    const res = await get({url: fileUrl, encoding: 'utf-8'});
    return fs.writeFileSync(filePath, res.body);
  },
  mkdir: (dir) => {
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
  },
  version: () => {
    return pkg.version;
  }
}
