const swPrecache = require('sw-precache');
const path = require('path');

const environment = require('./environment');
const db = require('./db');

const SWMETA_DOC_ID = 'service-worker-meta';

const getLoginPageContents = () => {
  // avoid circular dependency
  const loginController = require('./controllers/login');
  return loginController.renderLogin();
};

// Use the swPrecache library to generate a service-worker script
const writeServiceWorkerFile = async () => {
  const staticDirectoryPath = environment.getExtractedResourcesPath();
  const apiSrcDirectoryPath = __dirname;
  const scriptOutputPath = path.join(staticDirectoryPath, 'js', 'service-worker.js');

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

const writeServiceWorkerMetaDoc = () => {
  return db.medic
    .get(SWMETA_DOC_ID)
    .catch(err => {
      if (err.status === 404) {
        return { _id: SWMETA_DOC_ID };
      }
      throw err;
    })
    .then((doc) => {
      doc.generated_at = new Date().getTime();
      return db.medic.put(doc);
    })
    .catch(err => {
      // ignore conflicts
      if (err.status !== 409) {
        throw err;
      }
    });
};

module.exports = {
  run: () => {
    return writeServiceWorkerFile().then(() => writeServiceWorkerMetaDoc());
  },
};
