function(doc) {
  if (['contact', 'person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1) {
    var value = {
      shortcode: doc.patient_id || doc.place_id,
      primary_contact: typeof doc.contact === 'object' ? doc.contact._id : doc.contact,
    }
    var parent = doc;
    var depth = 0;
    while (parent) {
      if (parent._id) {
        emit([parent._id, depth], value);
      }
      depth++;
      parent = parent.parent;
    }
  }
}
