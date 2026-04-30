const buildUnknownCommandError = (scriptName, commandName, commands) => {
  const availableCommands = Object.keys(commands).sort();
  const commandLabel = commandName ? `"${commandName}"` : 'No command provided';
  const usage = availableCommands.length > 0
    ? `Available commands: ${availableCommands.join(', ')}`
    : 'No commands are available.';

  return new Error(`${scriptName}: ${commandLabel} is not a supported command.\n${usage}`);
};

const getCommand = ({ argv = process.argv, commands, scriptName }) => {
  const commandName = argv[2];
  const command = commandName && commands[commandName];

  if (!command) {
    throw buildUnknownCommandError(scriptName, commandName, commands);
  }

  return command;
};

module.exports = {
  getCommand,
};
