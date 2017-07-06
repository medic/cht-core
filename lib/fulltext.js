exports.data_records = {
  analyzer: 'perfield:{default:"standard"}',
  index: function(doc) {

    if (doc.type !== 'data_record') {
      return null;
    }

    var indexField = function(key, value, ret, id) {
      // if field key ends in _date, try to parse as date.
      if (/_date$/.test(key)) {
        var date = new Date(value);
        if (date) {
          ret.add(date, { field: key, type: 'date' });
        } else {
          log.info('failed to parse date "' + key + '" on ' + id);
        }
      } else if (typeof value === 'number') {
        ret.add(value, { field: key, type: 'int' });
      } else if (key === 'form') {
        ret.add(value);
        // string type forces an exact case insensitive match
        ret.add(value, { field: key, type: 'string' });
      } else if (typeof value === 'string') {
        ret.add(value);
        ret.add(value, {
          field: key === '_id' ? 'uuid' : key
        });
      }
    };

    var ret = new Document(),
        skip = ['type', '_rev', 'refid', 'id'],
        type;

    // index form fields and _id
    Object.keys(doc).forEach(function(key) {
      if (skip.indexOf(key) === -1) {
        indexField(key, doc[key], ret, doc._id);
      }
    });

    var parent = doc.contact;
    while(parent) {
      if (parent._id) {
        ret.add(parent._id, { field: 'clinic' });
      }
      parent = parent.parent;
    }

    if (doc.fields) {
      Object.keys(doc.fields).forEach(function(key) {
        indexField(key, doc.fields[key], ret, doc._id);
      });
    }

    if (doc.form === 'R') {
      // We don't have an LMP date so add an expected_date field with our best guess.
      // Mostly for analytics and usage statistics.
      var expected = new Date(doc.reported_date);
      var daysToAdd = 266; // 40 weeks, minus 2 weeks for date of conception
      expected.setDate(expected.getDate() + daysToAdd);
      ret.add(expected, { field: 'expected_date', type: 'date' });
    }

    if (doc.form) {
      type = 'report';
    } else if (doc.kujua_message) {
      type = 'messageoutgoing';
      if (doc.tasks && doc.tasks[0]) {
        ret.add(doc.tasks[0].state, { field: 'state' });
      }
    } else {
      type = 'messageincoming';
    }

    ret.add(type, { field: 'type' });

    ret.add(
      doc.errors ? doc.errors.length : 0,
      { field: 'errors', type: 'int' }
    );

    ret.add(doc.verified ? 'true' : 'false', { field: 'verified' });

    if (doc.contact && doc.contact._id) {
      ret.add(doc.contact._id, { field: 'contact' });
    }

    return ret;
  }
};

exports.contacts = {
  analyzer: 'standard',
  index: function(doc) {

    if (doc.type !== 'clinic' &&
        doc.type !== 'district_hospital' &&
        doc.type !== 'health_center' &&
        doc.type !== 'person') {
      // not a contact
      return null;
    }
    var ret = new Document();
    if (doc.name) {
      ret.add(doc.name.toLowerCase(), { field: 'name_sorting', index: 'not_analyzed' });
    }
    if (doc.contact && doc.contact.name) {
      ret.add(doc.contact.name);
      ret.add(doc.contact.name, { field: 'contact_name' });
    }

    if (doc.type === 'person') {
      // add parent as the clinic
      if (doc.parent && doc.parent._id) {
        ret.add(doc.parent._id, { field: 'clinic' });
      }
    } else {
      // add self as the clinic
      ret.add(doc._id, { field: 'clinic' });
    }

    var skip = ['_rev','id'];

    Object.keys(doc).forEach(function(key) {
      if (skip.indexOf(key) === -1 && typeof doc[key] === 'string') {
        ret.add(doc[key]);
        ret.add(doc[key], { field: key === '_id' ? 'uuid' : key });
      }
    });

    return ret;
  }
};
