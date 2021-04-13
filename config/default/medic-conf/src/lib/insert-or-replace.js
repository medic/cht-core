module.exports = (db, doc) =>
  db.get(doc._id)
    .then(existingDoc => doc._rev = existingDoc._rev)
    .catch(e => {
      if(e.status === 404) return;
      else throw e;
    })
    .then(() => db.put(doc));
