function(doc) {
  if (doc.type === 'translations') {
    emit([ 'translations', doc.enabled ], {
      code: doc.code,
      name: doc.name
    });
    return;
  }
  if (doc.type === 'user-settings') {
    emit([ doc.type ]);
    emit([ doc.type, doc.facility_id ]);
    return;
  }
  emit([ doc.type ]);
}
