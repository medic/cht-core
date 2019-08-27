// Only used by /scripts/delete_clinics_for_place.js
function (doc) {
  if (doc.type === 'contact' ||
      doc.type === 'clinic' ||
      doc.type === 'health_center' ||
      doc.type === 'district_hospital' ||
      doc.type === 'national_office') {
    var pid = doc.parent ? doc.parent._id : null;
    emit([doc.type, pid, doc.name], {name: doc.name});
  }
}
