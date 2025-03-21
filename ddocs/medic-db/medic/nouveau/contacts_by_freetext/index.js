function (doc) {
  var skip = ['_id', '_rev', 'type', 'refid', 'geolocation'];

  var indexMaybe = function(type, fieldName, value, opts) {
    if(String(value).length <= 2) { // Too short
      return;
    }
    index(type, fieldName, value, opts);
  };

  var indexField = function(key, value) {
    if (!key || !value) {
      return;
    }
    var lowerKey = key.toLowerCase();
    if (skip.indexOf(lowerKey) !== -1 || /_date$/.test(lowerKey)) {
      return;
    }

    if (typeof value === 'string') {
      var lowerValue = value.toLowerCase();
      indexMaybe('text', 'default', lowerValue);
      indexMaybe('string', 'exact_match', lowerKey + ':' + lowerValue);
    } else if (typeof value === 'number') {
      indexMaybe('string', 'exact_match', lowerKey + ':' + value);
    }
  };

  var getContactType = function() {
    if (doc.type === 'contact') {
      return doc.contact_type;
    }
    return doc.type;
  }

  var getContactTypeIndex = function(contactType) {
    var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    var idx = types.indexOf(contactType);

    if (doc.type === 'contact' && idx === -1) {
      // Custom type is its own "index"
      return contactType;
    }

    return idx;
  };

  var contactType = getContactType()
  var contactTypeIndex = getContactTypeIndex(contactType);
  if (contactTypeIndex === -1) {
    return;
  }

  index('string', 'contact_type', contactType);

  var dead = !!doc.date_of_death;
  var muted = !!doc.muted;
  var order = dead + ' ' + muted + ' ' + contactTypeIndex + ' ' + (doc.name && doc.name.toLowerCase());
  index('string', 'sort_order', order, { store: true });

  Object.keys(doc).forEach(function(key) {
    indexField(key, doc[key]);
  });
}
