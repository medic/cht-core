const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info, trace, warn } = require('../lib/log');

const SVGO = require('svgo');
const svgo = new SVGO();

module.exports = {
  requiresInstance: false,
  execute: () =>
    fs.recurseFiles(environment.pathToProject)
      .filter(name => name.endsWith('.svg'))
      .reduce((promiseChain, path) =>
        promiseChain
          .then(() => info(`Compressing SVG: ${path}…`))
          .then(() => svgo.optimize(fs.read(path), { path }))
          .then(result => fs.write(path, result.data))
          .then(() => trace('Compressed', path))
          .then(() => warn('Make sure you compare the content of your SVG files before merging to the master branch - sometimes optimising can change their contents!')),
        Promise.resolve())
};
