const path = require('path');
const fs = require('fs');

const constants = require('./../constants');

const getDownloadPath = () => path.join(__dirname, constants.DOWNLOAD_DIRECTORY);

const createDownloadDirectory = () => {
  const downloadPath = getDownloadPath();

  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
  }
};

const deleteDownloadDirectory = () => {
  fs.rmSync(getDownloadPath(), { force: true, recursive: true });
};

const findFiles = (term) => {
  return fs
    .readdirSync(getDownloadPath(), { withFileTypes: true })
    .filter(item => !item.isDirectory() && item.name.indexOf(term) > -1);
};

const getFileContent = (fileName) => {
  const filePath = getDownloadPath() + fileName;
  return fs.readFileSync(filePath, 'utf-8');
};

module.exports = {
  getDownloadPath,
  createDownloadDirectory,
  deleteDownloadDirectory,
  findFiles,
  getFileContent,
};
