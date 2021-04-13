const path = require('path');
const minimist = require('minimist');
const userPrompt = require('../lib/user-prompt');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const log = require('../lib/log');
const pouch = require('../lib/db');
const progressBar = require('../lib/progress-bar');

const { info, trace, warn, error } = log;

const FILE_EXTENSION = '.doc.json';
const INITIAL_BATCH_SIZE = 100;

const execute = async () => {
  const args = minimist(environment.extraArgs || [], { boolean: true });

  const docDir = path.resolve(environment.pathToProject, args.docDirectoryPath || 'json_docs');
  if(!fs.exists(docDir)) {
    warn(`No docs directory found at ${docDir}.`);
    return Promise.resolve();
  }

  const filesToUpload = fs.recurseFiles(docDir).filter(name => name.endsWith(FILE_EXTENSION));
  const docIdErrors = getErrorsWhereDocIdDiffersFromFilename(filesToUpload);
  if (docIdErrors.length > 0) {
    throw new Error(`upload-docs: ${docIdErrors.join('\n')}`);
  }

  const totalCount = filesToUpload.length;
  if (totalCount === 0) {
    return; // nothing to upload
  }

  warn(`This operation will permanently write ${totalCount} docs.  Are you sure you want to continue?`);
  if(!userPrompt.keyInYN()) {
    error('User failed to confirm action.');
    process.exit(1);
  }

  const results = { ok:[], failed:{} };
  const progress = log.level > log.LEVEL_ERROR ? progressBar.init(totalCount, '{{n}}/{{N}} docs ', ' {{%}} {{m}}:{{s}}') : null;
  const processNextBatch = async (docFiles, batchSize) => {
    const now = new Date();
    if(!docFiles.length) {
      if(progress) progress.done();

      const reportFile = `upload-docs.${now.getTime()}.log.json`;
      fs.writeJson(reportFile, results);
      info(`Summary: ${results.ok.length} of ${totalCount} docs uploaded OK.  Full report written to: ${reportFile}`);

      return;
    }

    const docs = docFiles.slice(0, batchSize)
        .map(file => {
          const doc = fs.readJson(file);
          doc.imported_date = now.toISOString();
          return doc;
        });

    trace('');
    trace(`Attempting to upload batch of ${docs.length} docs…`);

    try {
      const uploadResult = await pouch().bulkDocs(docs);
      if(progress) {
        progress.increment(docs.length);
      }

      uploadResult.forEach(result => {
        if(result.error) {
          results.failed[result.id] = `${result.error}: ${result.reason}`;
        } else {
          results.ok.push(result.id);
        }
      });

      return processNextBatch(docFiles.slice(batchSize), batchSize);
    } catch (err) {
      if (err.error === 'timeout') {
        if (batchSize > 1) {
          trace('');
          trace('Server connection timed out.  Decreasing batch size…');
          return processNextBatch(docFiles, batchSize / 2);
        } else {
          warn('Server connection timed out for batch size of 1 document.  We will continue to retry, but you might want to cancel the job if this continues.');
          return processNextBatch(docFiles, 1);
        }
      } else {
        throw err;
      }
    }
  };

  return processNextBatch(filesToUpload, INITIAL_BATCH_SIZE);
};

const getErrorsWhereDocIdDiffersFromFilename = filePaths =>
  filePaths
    .map(filePath => {
      const json = fs.readJson(filePath);
      const idFromFilename = path.basename(filePath, FILE_EXTENSION);

      if (json._id !== idFromFilename) {
        return `File '${filePath}' sets _id:'${json._id}' but the file's expected _id is '${idFromFilename}'.`;
      }
    })
    .filter(err => err);

module.exports = {
  requiresInstance: true,
  execute
};
