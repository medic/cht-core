const fs = require('./sync-fs');
const google = require('googleapis').google;
const googleAuth = require('./google-auth');
const info = require('./log').info;

// List of valid MIME types: https://developers.google.com/drive/api/v3/manage-downloads#downloading_google_documents
module.exports = async (filesJson, targetDir, mimeType) => {
  return googleAuth()
    .then(auth => {
      const drive = google.drive({ auth, version:'v3' });

      const files = fs.readJson(filesJson);

      return Object.keys(files)
        .reduce(fetchFile, Promise.resolve())
        .then(() => new Promise(resolve => {
          // Here we pause to avoid a suspected race condition when trying to
          // access the last-written xlsx file.  Reported at
          // https://github.com/medic/medic-conf/issues/88
          setTimeout(resolve, 500);
        }));

      function fetchFile(promiseChain, localName) {
        return promiseChain
          .then(() => new Promise((resolve, reject) => {
            const remoteName = files[localName];

            const fetchOpts = {
              auth,
              fileId: files[localName],
              mimeType,
            };

            const target = `${targetDir}/${localName}`;
            fs.mkdir(fs.path.dirname(target));

            info(`Exporting ${remoteName} from google drive to ${target}…`);

            drive.files.export(fetchOpts, { responseType:'stream' })
              .then(res => {
                res.data
                  .on('end', () => {
                    info(`Successfully wrote ${target}.`);
                    resolve();
                  })
                  .on('error', reject)
                  .pipe(fs.fs.createWriteStream(target));
              })
              .catch(reject);
          }));
      }
    });
};
