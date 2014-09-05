var _ = require('underscore'),
    db = require('./db'),
    settings;

module.exports = {
  get: function(key) {
    return settings[key];
  },
  load: function(callback) {
    db.getSettings(function(err, data) {
      if (err) {
        return callback(err);
      }
      settings = data.settings;
      callback();
    });
  },
  listen: function() {
    db.info(function(err, info) {
      if (err) {
        console.error('Could not attach changes stream: ' + JSON.stringify(err));
        process.exit(1);
        return;
      }
      var stream = db.changesStream({
        filter: 'kujua-sentinel/config_docs',
        since: info.update_seq
      });
      stream.on('data', function() {
        module.exports.load(function(err) {
          if (err) {
            console.log('Failed to reload settings', err);
            process.exit(1);
          }
        });
      });
      stream.on('error', function(err) {
        console.log('Changes stream error', err);
        process.exit(1);
      });
      stream.on('end', function(err) {
        console.log('Changes stream ended', err);
        process.exit(1);
      });
    });
  }
};
