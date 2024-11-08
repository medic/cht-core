function(doc) {
  if (doc.type === 'translations') {
    emit([ 'translations', doc.enabled ], {
      name: doc.name,
      code: doc.code,
    });
    return;
  }
  emit([ doc.type ]);
}
