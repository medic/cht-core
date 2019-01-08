const chalk = require('chalk'),
      figlet = require('figlet'),
      utils = require('./utils');

module.exports = {
  show: (text) => {
    const color = text.toLowerCase() === 'upload' ? 'yellow' : 'green';
    console.log(chalk[color](
      figlet.textSync(`${utils.capitalize(text)}-Medic-Translations`,
          { horizontalLayout: 'default' })
    ));
  }
}
