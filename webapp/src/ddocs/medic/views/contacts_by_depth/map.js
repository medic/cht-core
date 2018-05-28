// WARNING: If updating this function also update the corresponding view in medic-tombstone
function(doc) {
  if (['person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1) {
    var value = doc.patient_id || doc.place_id;
    var parent = doc;
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
