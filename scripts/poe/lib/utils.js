const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const req = require('request');
const {promisify} = require('util');
const get = promisify(req.get);
const pkg = require('../../../package.json');

const tempFile = (filePath) => {
  const file =  path.parse(filePath);
  file.base = `~${file.base}`;
  return path.format(file);
};

module.exports = {
  capitalize: (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
  error: (msg) => {
    console.log(`${chalk.red('Error: ')}${msg}`);
  },
  log: (msg) => {
    console.log(msg);
  },
  mkdir: (dir) => {
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    return fs.existsSync(dir);
  },
  mmVersion: () => {
    return pkg.version;
  },
  sanitize: (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content
      .toString()
      .split('\n')
      .filter(line => !line.startsWith('#'))
      .sort();
    fs.writeFileSync(tempFile(filePath), lines.join('\n'), 'utf8');
    return tempFile(filePath);
  },
  save: async (fileUrl, filePath) => {
    const res = await get({url: fileUrl, encoding: 'utf-8'});
    return fs.writeFileSync(filePath, res.body);
  },
  tempFile
};
