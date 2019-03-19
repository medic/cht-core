function(doc) {
  if (doc.outbound_queue && doc.outbound_queue.length) {
    emit();
  }
}
