module.exports = {
  show: (cmds) => {
    console.log(`Usage: node src [${cmds.join(' || ')}]`);
  }
}
