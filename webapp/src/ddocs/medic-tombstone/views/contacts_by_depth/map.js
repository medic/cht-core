// WARNING: If updating this function also update the corresponding view in medic ddoc
function(doc) {
  if (doc.type !== 'tombstone' || !doc.tombstone) {
    return;
  }
  var tombstone = doc.tombstone;

  if (['person', 'clinic', 'health_center', 'district_hospital'].indexOf(tombstone.type) !== -1) {
    var value = tombstone.patient_id || tombstone.place_id;
    var parent = tombstone;
    var depth = 0;
    while (parent) {
      if (parent._id) {
        emit([parent._id], value);
        emit([parent._id, depth], value);
      }
      depth++;
      parent = parent.parent;
    }
  }
}
