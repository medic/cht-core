const db = require('../db');
const moment = require('moment');

const convertBadDobFormat = docs => {
  docs.forEach(function(doc) {
    doc.date_of_birth = moment(doc.date_of_birth, 'MMM Do, YYYY').format('YYYY-MM-DD');
  });

  return db.medic.bulkDocs(docs);
};

module.exports = {
  name: 'convert-bad-dob-format',
  created: new Date(2016, 4, 20),
  run: () => {
    return db.medic.find({
      selector: {
        type: 'person',
        date_of_birth: {
          $regex: ' '
        }
      }
    })
      .then(results => convertBadDobFormat(results.docs));
  }
};
