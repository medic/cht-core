/**
 * EventEmitter for Duality core
 *
 * This has to be a separate module to duality/core because dualty/core will
 * directly require the app it's running. The app will often want to bind to
 * duality events when evaluated. This causes a circular dependency, causing
 * duality/core to be an empty object without the EventEmitter methods
 * available.
 */

var events = require('events');
var exports = module.exports = new events.EventEmitter();
