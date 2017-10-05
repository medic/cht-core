const fs = require('fs'),
      asyncEach = require('async/each'),
      db = require('../db');

const resources = [
  { name: 'person', file: 'person.svg', type: 'image/svg+xml' },
  { name: 'clinic', file: 'clinic.svg', type: 'image/svg+xml' },
  { name: 'health_center', file: 'health_center.svg', type: 'image/svg+xml' },
  { name: 'district_hospital', file: 'district_hospital.svg', type: 'image/svg+xml' }
];

module.exports = {
  name: 'add-contact-icons-to-resources-doc',
  created: new Date(2017, 10, 5, 15, 0, 0, 0),
  run: callback => {
    db.medic.get('resources', (err, doc) => {
      if (err) {
        return callback(err);
      }
      asyncEach(
        resources,
        (resource, callback) => {
          if (doc.resources[resource.name]) {
            // don't overwrite the existing attachment
            return callback();
          }
          fs.readFile('resources/' + resource.file, (err, data) => {
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
  }
};
