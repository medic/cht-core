const fs = require('fs');

const actions = fs.readdirSync(`${__dirname}/../fn`)
                  .filter(name => name.endsWith('.js'))
                  .map(name => name.substring(0, name.length - 3));

module.exports = actions;
