const chalk = require('chalk'),
      figlet = require('figlet');

module.exports = {
  show: (text) => {
    const color = text.toLowerCase() === 'import' ? 'yellow' : 'green';
    console.log(chalk[color](
      figlet.textSync(`poe-${text}`,
          { horizontalLayout: 'default' })
    ));
  }
};
