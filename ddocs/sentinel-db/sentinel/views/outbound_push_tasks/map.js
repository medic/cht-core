function(doc) {
  if (doc.type === 'task:outbound') {
    emit();
  }
}
