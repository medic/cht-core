function(doc) {
  if (doc.type === 'tombstone' && doc.tombstone) {
    doc = doc.tombstone;
  }
  if (['contact', 'person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1) {
    var value = doc.patient_id || doc.place_id;
    var parent = doc;
    var depth = 0;
    while (parent) {
      if (parent._id) {
        emit([parent._id], value);
        emit([parent._id, depth], value);
        if(doc.type === 'person' && depth > 1){
          var p_depth = depth - 0.5;
          emit([parent._id, p_depth], value)
        }
      }
      depth++;
      parent = parent.parent;
    }
  }
}
