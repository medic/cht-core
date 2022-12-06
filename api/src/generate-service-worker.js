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

const staticDirectoryPath = environment.staticPath;
const webappDirectoryPath = environment.webappPath;
const scriptOutputPath = path.join(webappDirectoryPath, 'service-worker.js');

const BAR = '!function(e){var t={};function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)r.d(n,o,function(t){return e[t]}.bind(null,o));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=0)}([function(e,t,r){"use strict";r.r(t),window.__api={bar:function(){return"something"}}}]);';

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
    return [path.join(apiSrcDirectoryPath, 'templates', 'login', 'index.html')];
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
      path.join(webappDirectoryPath, '{audio,img}', '*'),
      path.join(webappDirectoryPath, 'manifest.json'),
      path.join(webappDirectoryPath, '*.js'),
      path.join(webappDirectoryPath, '*.css'),
      `!${scriptOutputPath}`, // exclude service worker path

      // Fonts
      path.join(webappDirectoryPath, 'fontawesome-webfont.woff2'),
      path.join(webappDirectoryPath, 'fonts', 'enketo-icons-v2.woff'),
      path.join(webappDirectoryPath, 'fonts', 'NotoSans-Bold.ttf'),
      path.join(webappDirectoryPath, 'fonts', 'NotoSans-Regular.ttf'),
      path.join(staticDirectoryPath, 'login', '*.{css,js}'),
    ],
    dynamicUrlToDependencies: {
      '/': [path.join(webappDirectoryPath, 'index.html')], // Webapp's entry point
      '/medic/login': await getLoginPageContents(),
      '/medic/_design/medic/_rewrite/': [path.join(webappDirectoryPath, 'appcache-upgrade.html')],
      // TODO fetch from db
      // TODO iterate over all attachments so they are cached separately
      '/libs/bar.js': BAR
    },
    ignoreUrlParametersMatching: [/redirect/, /username/],
    stripPrefixMulti: {
      [webappDirectoryPath]: '',
      [staticDirectoryPath]: '',
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

let generate = false;
module.exports = {
  run: async (unlock) => {
    if (unlock) {
      generate = true;
    }
    if (!generate) {
      return;
    }

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
