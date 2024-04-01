function(doc) {
  if (doc.type === 'translations') {
    emit([ 'translations', doc.enabled ], {
      code: doc.code,
      name: doc.name
    });
    return;
  }
  emit([ doc.type ]);
}
