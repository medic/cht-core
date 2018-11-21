const fs = require('fs'),
      path = require('path'),
      {promisify} = require('util'),
      asyncEach = require('async/each'),
      db = require('../db-nano'),
      RESOURCE_ID = 'branding';

const resources = [
  { name: 'favicon', file: 'favicon.ico', type: 'image/x-icon' }
];

module.exports = {
  name: 'add-favicon-to-branding-doc',
  created: new Date(2017, 10, 5, 15, 0, 0, 0),
  run: promisify(callback => {
    db.medic.get(RESOURCE_ID, (err, doc) => {
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
          const source = path.join(__dirname, '..', 'resources/ico', resource.file);
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
