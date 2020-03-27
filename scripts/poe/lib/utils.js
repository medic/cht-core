const fs = require('fs');
const chalk = require('chalk');
const get = require('./get');
const pkg = require('../../../package.json');

const extractPlaceholdersFromFile = (file, extraPlaceholders = {}) => {
  const content = fs.readFileSync(file, 'utf8');

  const result = {};
  content
    .split('\n')
    .forEach((line, index) => {
      const key = line.split('=')[0].trim();
      let placeholders = line.match(/{{.+?}}/g);
      if (placeholders) {
        placeholders = placeholders
          .sort()
          .concat(extraPlaceholders[key] ? extraPlaceholders[key].placeholders : [])
          .filter((el, i, a) => i === a.indexOf(el));
        result[key] = {placeholders, index};
      } else if (extraPlaceholders[key]) {
        result[key] = extraPlaceholders[key];
      }
    });
  return result;  
};

module.exports = {
  capitalize: (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
  error: (msg) => {
    console.log(`${chalk.red('Error: ')}${msg}`);
  },
  extractPlaceholders: (file, extraPlaceholdersFile) => {
    const extraPlaceholders = extraPlaceholdersFile ? extractPlaceholdersFromFile(extraPlaceholdersFile) : {};
    const placeholders = extractPlaceholdersFromFile(file, extraPlaceholders);

    return placeholders;
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
      .split('\n')
      .filter(line => !line.trim().startsWith('#'))
      .sort()
      .join('\n');
    return fs.writeFileSync(filePath, out);
  }
};
