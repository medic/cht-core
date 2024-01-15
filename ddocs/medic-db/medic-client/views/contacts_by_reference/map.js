function(doc) {
  if (doc.type === 'contact' ||
      doc.type === 'clinic' ||
      doc.type === 'health_center' ||
      doc.type === 'district_hospital' ||
      doc.type === 'national_office' ||
      doc.type === 'person') {

    var emitReference = function(prefix, key) {
      emit([ prefix, String(key) ], doc.reported_date);
    };

    if (doc.place_id) {
      emitReference('shortcode', doc.place_id);
    }
    if (doc.patient_id) {
      emitReference('shortcode', doc.patient_id);
    }
    if (doc.rc_code) {
      // need String because rewriter wraps everything in quotes
      // keep refid case-insenstive since data is usually coming from SMS
      emitReference('external', String(doc.rc_code).toUpperCase());
    }
  }
}
