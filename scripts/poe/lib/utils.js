const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const req = require('request');
const {promisify} = require('util');
const get = promisify(req.get);
const pkg = require('../../../package.json');

const extractPlaceholders = (file) => {
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
};

const tempFilePath = (filePath) => {
  const file =  path.parse(filePath);
  file.base = `~${file.base}`;
  return path.format(file);
};

module.exports = {
  capitalize: (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
  comparePlaceholders: async (langs, filePath) => {
    const dir =`${process.cwd()}/${filePath}`;
    const templateFile = `${dir}/messages-en.properties`;
    langs.filter(lang => lang !== 'en').forEach(lang => {
      const file = `${dir}/messages-${lang}.properties`;
      const translations = extractPlaceholders(file);
      const translationsTemplate = extractPlaceholders(templateFile);
      const errors = translations.map((e1) => {
        const e2 = translationsTemplate.find(t => t.key === e1.key);
        if (e1.match.toString() !== e2.match.toString()) {
          return `filename: Translation key ${e1.key} on line ${e1.index + 1} has placeholders that do not match those of messages-en.properties`;
        }
      })
      .filter(Boolean);
      errors.forEach(err => {
        const regex = /filename/gi;
        console.log(`\n${chalk.yellow('Warning: ')}${err.replace(regex,  `messages-${lang}.properties`)}`);
      });
    });
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
    fs.writeFileSync(tempFilePath(filePath), lines.join('\n'), 'utf8');
    return tempFilePath(filePath);
  },
  save: async (fileUrl, filePath) => {
    const res = await get({url: fileUrl, encoding: 'utf-8'});
    return fs.writeFileSync(filePath, res.body);
  },
  tempFilePath
};
