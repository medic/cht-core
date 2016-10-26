var PLACE_TYPES = ['national_office', 'clinic', 'health_center', 'district_hospital']
var CONTACT_TYPES = PLACE_TYPES.concat('person');

exports.isContactType = function(doc) {
  return doc && CONTACT_TYPES.indexOf(doc.type) !== -1;
};

exports.isPlaceType = function(doc) {
  return doc && PLACE_TYPES.indexOf(doc.type) !== -1;
};

exports.getParent = function(parent, type) {
  while (parent && parent.type !== type) {
    parent = parent.parent;
  }
  return parent;
};

exports.getParentId = function(parent, type) {
  var parent = exports.getParent(parent, type);
  return parent && parent._id;
};
