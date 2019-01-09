const commandLineUsage = require('command-line-usage');

const sections = [
  {
    header: 'poe',
    content: 'poeditor cli.'
  },
  {
    header: 'Options',
    content: '$ poe <command>'
  },
  {
    header: 'Command List',
    content: [
      { name: 'import',    summary: 'Import translation.' },
      { name: 'export',    summary: 'Export translation(s).' },
      { name: 'slacktest', summary: 'Test slack interface.' },
      { name: 'version',   summary: 'poe cli version.' },
    ]
  }
];

const usage = commandLineUsage(sections);

module.exports = {
  show: () => {
    console.log(usage);
  }
};
