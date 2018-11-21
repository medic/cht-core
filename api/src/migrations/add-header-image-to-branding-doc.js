const fs = require('fs'),
      path = require('path'),
      {promisify} = require('util'),
      asyncEach = require('async/each'),
      db = require('../db-nano');

const resources = [
  { name: 'logo', file: 'medic-logo-light-full.svg', type: 'image/svg+xml' }
];

module.exports = {
  name: 'add-header-image-to-branding-doc',
  created: new Date(2017, 10, 5, 15, 0, 0, 0),
  run: promisify(callback => {
    db.medic.get('branding', (err, doc) => {
      if (err) {
        return callback(err);
      }
      if (!doc._attachments) {
        doc._attachments = {};
      }
      asyncEach(
        resources,
        (resource, callback) => {
          if (doc.resources[resource.name]) {
            // don't overwrite the existing attachment
            return callback();
          }
          const source = path.join(__dirname, '..', 'resources/logo', resource.file);
          fs.readFile(source, (err, data) => {
            if (err) {
              return callback(err);
            }
            doc.resources[resource.name] = resource.file;
            doc._attachments[resource.file] = {
              content_type: resource.type,
              data: new Buffer(data).toString('base64')
            };
            callback();
          });
        },
        err => {
          if (err) {
            return callback(err);
          }
          db.medic.insert(doc, callback);
        }
      );
    });
  })
};
