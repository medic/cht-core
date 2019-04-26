const fs = require('fs');
const os = require('os');
const chalk = require('chalk');
const req = require('request');
const {promisify} = require('util');
const get = promisify(req.get);
const pkg = require('../../../package.json');

module.exports = {
  capitalize: (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
  error: (msg) => {
    console.log(`${chalk.red('Error: ')}${msg}`);
  },
  extractPlaceholders: (file) => {
    const content = fs.readFileSync(file, 'utf8');
    return content
      .toString()
      .split('\n')
      .map((line, index) => {
        const match = line.match(/{{.+?}}/g);
        if (match) {
          const key = line.split('=')[0].trim();
          return { match, key, index };
        }
      })
      .filter(Boolean);
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
  save: async (fileUrl, filePath) => {
    const res = await get({url: fileUrl, encoding: 'utf-8'});
    /*
      - Sort file content alpahabetically in ascending order
      - Get rid of comments (lines starting with #)
    */
    const out = res.body
      .split(os.EOL)
      .filter(line => !line.startsWith('#'))
      .sort()
      .join(os.EOL);
    return fs.writeFileSync(filePath, out);
  }
};
