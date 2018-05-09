function(doc) {
  if (doc.type !== 'tombstone' || !doc.tombstone) {
    return;
  }
  var tombstone = doc.tombstone;

  if (tombstone.type === 'clinic' ||
      tombstone.type === 'health_center' ||
      tombstone.type === 'district_hospital' ||
      tombstone.type === 'national_office' ||
      tombstone.type === 'person') {

    var emitReference = function(prefix, key) {
      emit([ prefix, String(key) ], tombstone.reported_date);
    };

    if (tombstone.place_id) {
      emitReference('shortcode', tombstone.place_id);
    }
    if (tombstone.patient_id) {
      emitReference('shortcode', tombstone.patient_id);
    }
    if (tombstone.simprints_id) {
      emitReference('simprints', tombstone.simprints_id);
    }
    if (tombstone.rc_code) {
      // need String because rewriter wraps everything in quotes
      // keep refid case-insenstive since data is usually coming from SMS
      emitReference('external', String(tombstone.rc_code).toUpperCase());
    }
  }
}
