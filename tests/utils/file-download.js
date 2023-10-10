const path = require('path');
const fs = require('fs');

const constants = require('@constants');

const DOWNLOAD_PATH = path.join(__dirname, '..', constants.DOWNLOAD_DIRECTORY);

const createDownloadDirectory = () => {
  // Delete directory, if it already exists
  deleteDownloadDirectory();
  // Then create directory
  fs.mkdirSync(DOWNLOAD_PATH);
};

const deleteDownloadDirectory = () => {
  if (fs.existsSync(DOWNLOAD_PATH)) {
    fs.rmSync(DOWNLOAD_PATH, { force: true, recursive: true });
  }
};

const findFiles = (term) => {
  return fs
    .readdirSync(DOWNLOAD_PATH, { withFileTypes: true })
    .filter(item => !item.isDirectory() && item.name.indexOf(term) > -1);
};

const getFileContent = (fileName) => {
  return fs.readFileSync(path.join(DOWNLOAD_PATH, fileName), 'utf-8');
};

const waitForDownload = (term) => {
  let interval;
  let timeout;
  let files;

  return new Promise((resolve, reject) => {
    try {
      interval = setInterval(() => {
        files = findFiles(term);
        if (files && files.length) {
          resolve(files);
          clearInterval(interval);
          clearTimeout(timeout);
        }
      }, 500);

      timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error(`No Files found in download directory. Term: "${term}".`));
      }, 60 * 1000);

    } catch (error) {
      reject(error);
      clearInterval(interval);
      clearTimeout(timeout);
    }
  });
};

const setupDownloadFolder = () => {
  createDownloadDirectory();
  //global.downloadDir = DOWNLOAD_PATH;

  browser.cdp('Page', 'setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: DOWNLOAD_PATH,
  });
};

module.exports = {
  deleteDownloadDirectory,
  findFiles,
  getFileContent,
  waitForDownload,
  setupDownloadFolder,
};
