const commands = require('./index');
const { getCommand } = require('./get-command');

const SCRIPT_NAME = 'scripts/build/cli.js';

(async () => {
  try {
    await getCommand({ commands, scriptName: SCRIPT_NAME })();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
