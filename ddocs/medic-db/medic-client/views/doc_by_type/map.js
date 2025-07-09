function(doc) {
  if (doc.type === 'form' ||
      doc.type === 'user-settings' ||
      doc.type === 'audit_record') {
    emit([ doc.type ]);
  } else if (doc.type === 'translations') {
    emit([ 'translations', doc.enabled ], {
      code: doc.code,
      name: doc.name
    });
  }
}
