function(doc) {
  if (doc.type === 'user' && doc.token_login && doc.token_login.active) {
    var key = [ doc.token_login.token, doc.token_login.hash ];
    var value = { token_expiration_date : doc.token_login.expiration_date };
    emit(key, value);
  }
}
