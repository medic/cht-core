const fs = require('../lib/sync-fs');
const { error } = require('../lib/log');

const supported_shells = ['bash'];

module.exports = shell => {

  if (supported_shells.includes(shell)){
    const completionFile = `${__dirname}/shell-completion.${shell}`;
    if (fs.exists(completionFile)){
      console.log(fs.read(completionFile));
      process.exit(0);
    }
  } else if (shell === true){
    error('shell type argument not specified e.g. --shell-completion=bash');
  } else {
    error(`completion not yet supported for '${shell}' shell`);
  }
  process.exit(1);
};
