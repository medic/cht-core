module.exports = (db, { include_docs=false }={}) => {
  const options = {
    include_docs: include_docs,
    key: ['form']
  };
  return db.query('medic-client/doc_by_type', options).catch(err => {
    if (err.status === 404) {
      if (err.reason === 'missing') {
        throw new Error('Failed to find medic-client ddoc on server');
      }
      if (err.reason === 'missing_named_view') {
        throw new Error('Failed to find view "doc_by_type" in medic-client ddoc');
      }
    }
    throw err;
  });
};
