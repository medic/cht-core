const db = require('../db');

const removeEmptyParents = docs => {
  docs.forEach(doc => {
    delete doc.parent;
  });

  return db.medic.bulkDocs(docs);
};

module.exports = {
  name: 'remove-empty-parents',
  created: new Date(2016, 7, 10, 13, 37, 0, 0),
  run: () => {
    return db.medic.find({
      selector: {
        type: {
          $in: ['district_hospital', 'health_center', 'clinic', 'person']
        },
        $or: [
          {
            parent: {
              $eq: null
            }
          },
          {
            parent: {
              $exists: true,
              _id: {
                $exists: false
              }
            }
          }
        ]
      }
    })
      .then(result => removeEmptyParents(result.docs));
  }
};
