const fs = require('fs'),
      path = require('path'),
      {promisify} = require('util'),
      asyncEach = require('async/each'),
      db = require('../db-nano');

const resources = [
  { name: 'medic-person', file: 'medic-person.svg', type: 'image/svg+xml' },
  { name: 'medic-clinic', file: 'medic-clinic.svg', type: 'image/svg+xml' },
  { name: 'medic-health-center', file: 'medic-health-center.svg', type: 'image/svg+xml' },
  { name: 'medic-district-hospital', file: 'medic-district-hospital.svg', type: 'image/svg+xml' }
];

module.exports = {
  name: 'add-contact-icons-to-resources-doc',
  created: new Date(2017, 10, 5, 15, 0, 0, 0),
  run: promisify(callback => {
    db.medic.get('resources', (err, doc) => {
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
          const source = path.join(__dirname, '..', 'resources', resource.file);
          fs.readFile(source, (err, data) => {
            if (err) {
              return callback(err);
            }
            doc.resources[resource.name] = resource.file;
            doc._attachments[resource.file] = {
              content_type: resource.type,
              data: Buffer.from(data, 'base64')
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
