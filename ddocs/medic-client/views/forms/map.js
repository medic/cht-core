function(doc) {
  if (doc.type !== 'form' || !doc._attachments || !doc._attachments.xml) {
    return;
  }
  emit(doc.internalId);
}
