const swPrecache = require('sw-precache');
const path = require('path');

function registerServiceWorkerTasks(grunt) {
  grunt.registerMultiTask('generate-service-worker', function() {
    const done = this.async();
    const { staticDirectoryPath, scriptOutputPath } = this.data;
    writeServiceWorkerFile(staticDirectoryPath, scriptOutputPath)
      .then(done)
      .then(grunt.task.run('exec:cat-generated-service-worker'))
      .catch(error => {
        grunt.fail.warn(error);
        done();
      });
  });
}

// Use the swPrecache library to generate a service-worker script
function writeServiceWorkerFile(staticDirectoryPath, outputPath) {
  const config = {
    cacheId: 'cache',
    claimsClient: true,
    skipWaiting: true,
    directoryIndex: false,
    handleFetch: false, // See our custom fetch handler ./service-worker-fetch-listener.js
    staticFileGlobs: [
      path.join(staticDirectoryPath, '{audio,css,fonts,img,js,xslt}', '*'),
      path.join(staticDirectoryPath, 'manfiest.json'),
    ],
    dynamicUrlToDependencies: {
      ['/']: [path.join(staticDirectoryPath, 'templates', 'inbox.html')],
    },
    stripPrefixMulti: { [staticDirectoryPath]: '' },
    maximumFileSizeToCacheInBytes: 1048576 * 20,
    verbose: true,
  };

  return swPrecache.write(outputPath, config);
}

module.exports = registerServiceWorkerTasks;
