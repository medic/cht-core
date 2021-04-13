const path = require('path');
const fs = require('./sync-fs');

const archiveDocToFile = (folderPath, fileName, content) => {
  fs.mkdir(folderPath);

  const replacer = (name, val) => {
    if (name === 'data' && val && val.type === 'Buffer') {
      return Buffer.from(val).toString('base64');
    }

    return val;
  };

  const sanitizedFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-'); // for Windows
  const destination = path.resolve(folderPath, `${sanitizedFileName}.doc.json`);
  const fileContent = typeof content === 'string' ? content : JSON.stringify(content, replacer);
  fs.write(destination, fileContent);
};

module.exports = archiveDocToFile;
