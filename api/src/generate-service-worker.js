const swPrecache = require('sw-precache');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const environment = require('./environment');
const db = require('./db');
const logger = require('./logger');
const loginController = require('./controllers/login');

const SWMETA_DOC_ID = 'service-worker-meta';
const apiSrcDirectoryPath = __dirname;

const staticDirectoryPath = environment.getExtractedResourcesPath();
const scriptOutputPath = path.join(staticDirectoryPath, 'js', 'service-worker.js');

const fsExists = (path) => new Promise((resolve) => {
  fs.access(path, (err) => resolve(!err));
});

/**
 * Generates a sha1 of the existent service worker file.
 * If the file does not exist, it returns undefined.
 * If any error occurs when reading, it returns undefined.
 * If any error occurs when generating the hash, it returns undefined.
 * @return {Promise<string|undefined>}
 */
const getServiceWorkerHash = async () => {
  if (!await fsExists(scriptOutputPath)) {
    return;
  }

  return new Promise((resolve) => {
    try {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(scriptOutputPath);
      stream.setEncoding('utf8');
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => {
        logger.error('Error while reading service worker: %o', err);
        resolve();
      });
    } catch (err) {
      logger.error('Error while generating service worker hash: %o', err);
      resolve();
    }
  });
};

const getLoginPageContents = async () => {
  try {
    return await loginController.renderLogin();
  } catch (err) {
    logger.error('Error rendering login page %o', err);
    // default to returning the file
    return [path.join(apiSrcDirectoryPath, 'templates/login', 'index.html')];
  }
};

// Use the swPrecache library to generate a service-worker script
const writeServiceWorkerFile = async () => {
  const config = {
    cacheId: 'cache',
    claimsClient: true,
    skipWaiting: true,
    directoryIndex: false,
    handleFetch: true,
    staticFileGlobs: [
      path.join(staticDirectoryPath, '{audio,img}', '*'),
      path.join(staticDirectoryPath, 'manifest.json'),
      path.join(staticDirectoryPath, '*.js'),
      path.join(staticDirectoryPath, '*.css'),

      // Fonts
      path.join(staticDirectoryPath, 'fontawesome-webfont.woff2'),
      path.join(staticDirectoryPath, 'fonts', 'enketo-icons-v2.woff'),
      path.join(staticDirectoryPath, 'fonts', 'NotoSans-Bold.ttf'),
      path.join(staticDirectoryPath, 'fonts', 'NotoSans-Regular.ttf'),
      path.join(apiSrcDirectoryPath, 'public/login', '*.{css,js}'),
    ],
    dynamicUrlToDependencies: {
      '/': [path.join(staticDirectoryPath, 'index.html')], // Webapp's entry point
      '/medic/login': await getLoginPageContents(),
      '/medic/_design/medic/_rewrite/': [path.join(apiSrcDirectoryPath, 'public', 'appcache-upgrade.html')],
    },
    ignoreUrlParametersMatching: [/redirect/, /username/],
    stripPrefixMulti: {
      [staticDirectoryPath]: '',
      [path.join(apiSrcDirectoryPath, 'public')]: '',
    },
    maximumFileSizeToCacheInBytes: 1048576 * 30,
    verbose: true,
  };

  return swPrecache.write(scriptOutputPath, config);
};

const getSwMetaDoc = async () => {
  try {
    return await db.medic.get(SWMETA_DOC_ID);
  } catch (err) {
    if (err.status === 404) {
      return { _id: SWMETA_DOC_ID };
    }
    throw err;
  }
};

// We need client-side logic to trigger a service worker update when a cached resource changes.
// Since service-worker.js contains a hash of every cached resource, watching it for changes is sufficient to detect a
// required update.
// To this end, create a new doc (SWMETA_DOC_ID) which replicates to clients.
// The intention is that when this doc changes, clients will refresh their cache.
const writeServiceWorkerMetaDoc = async (hash) => {
  try {
    const doc = await getSwMetaDoc();
    doc.generated_at = new Date().getTime();
    doc.hash = hash;
    await db.medic.put(doc);
  } catch (err) {
    // don't log conflicts
    if (err.status !== 409) {
      logger.error('Error while saving service worker meta doc %o', err);
    }
  }
};

module.exports = {
  run: async () => {
    const initialHash = await getServiceWorkerHash();
    await writeServiceWorkerFile();
    const updatedHash = await getServiceWorkerHash();

    if (!updatedHash) {
      logger.warn('Service worker meta file not updated.');
      return;
    }

    if (!initialHash || initialHash !== updatedHash) {
      await writeServiceWorkerMetaDoc(updatedHash);
    }
    logger.info('Service worker generated successfully');
  },
};
