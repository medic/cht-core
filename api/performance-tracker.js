module.exports = function(taskName) {
  let last = Date.now(), next;

  function log(...messages) {
    console.log('PERFORMANCE', taskName, ...messages);
  }

  log('START');

  return function(message) {
    next = Date.now();
    const duration = next - last;
    log(`${duration}ms`, message);
    last = next;
  };
};
