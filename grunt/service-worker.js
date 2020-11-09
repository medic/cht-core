const swPrecache = require('sw-precache');
const path = require('path');

function registerServiceWorkerTasks(grunt) {
  grunt.registerMultiTask('generate-service-worker', function() {
    const done = this.async();
    writeServiceWorkerFile(this.data)
      .then(done)
      .catch(error => {
        grunt.fail.warn(error);
        done();
      });
  });
}

// Use the swPrecache library to generate a service-worker script
function writeServiceWorkerFile({staticDirectoryPath, apiSrcDirectoryPath, scriptOutputPath}) {
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
      '/': [path.join(staticDirectoryPath, 'inbox.html')],
      '/medic/login': [path.join(apiSrcDirectoryPath, 'templates/login', 'index.html')],
      '/medic/_design/medic/_rewrite/': [path.join(apiSrcDirectoryPath, 'public', 'appcache-upgrade.html')],
    },
    ignoreUrlParametersMatching: [/redirect/],
    stripPrefixMulti: {
      [staticDirectoryPath]: '',
      [path.join(apiSrcDirectoryPath, 'public')]: '',
    },
    maximumFileSizeToCacheInBytes: 1048576 * 30,
    verbose: true,
  };

  return swPrecache.write(scriptOutputPath, config);
}

module.exports = registerServiceWorkerTasks;
