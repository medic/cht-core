var _ = require('underscore'),
    follow = require('follow'),
    db = require('./db'),
    settings;

var defaults = {
  anc_forms: {
    registration: 'R',
    registrationLmp: 'P',
    visit: 'V',
    delivery: 'D',
    flag: 'F'
  }
};

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
      _.defaults(settings, defaults);
      callback();
    });
  },
  listen: function() {
    var feed = new follow.Feed({
      db: process.env.COUCH_URL,
      since: 'now'
    });

    feed.filter = function(doc) {
      return doc._id === '_design/medic';
    };

    feed.on('change', function(change) {
      console.log('Detected settings change - reloading');
      module.exports.load(function(err) {
        if (err) {
          console.log('Failed to reload settings', err);
          process.exit(1);
        }
      });
    });

    feed.follow();
  }
};
