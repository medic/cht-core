const Json2csvParser = require('json2csv').Parser;
const fs = require('./sync-fs');
const info = require('./log').info;

module.exports = (data, csvPath) => {
  const fields = ['username', 'password', 'roles', 'contact', 'phone', 'place'];
  const json2csvParser = new Json2csvParser({
    fields,
    doubleQuote: '\'',
    flatten: true
  });
  data.forEach(function(user) {
    if (typeof user.contact === 'object') {
      user.contact = user.contact._id;
    }
    //type is deprecated in the api and is replaced by roles
    //passing type to the api will use that for the roles instead of roles
    //type here is being generated based on the type of doc being created
    delete user.type;
  });
  const csv = json2csvParser.parse(data);
  fs.write(csvPath, csv);
  info('Users csv has been saved');
};
