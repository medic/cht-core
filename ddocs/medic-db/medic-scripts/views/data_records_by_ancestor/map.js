// Only used in ./scripts/delete_training_data_utils.js
function(doc) {
  if (doc.type === 'data_record') {
    var contact = doc.contact;
    while (contact) {
      if (contact._id) {
        emit(contact._id);
      }
      contact = contact.parent;
    }
  }
}
