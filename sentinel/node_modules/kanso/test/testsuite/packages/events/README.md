## Events module

This is a browser port of the node.js events module. Many objects and
modules emit events and these are instances of events.EventEmitter.

You can access this module by doing: `require("events")`

Functions can then be attached to objects, to be executed when an event is
emitted. These functions are called listeners.


### API


#### events.EventEmitter

To access the EventEmitter class, require('events').EventEmitter.

When an EventEmitter instance experiences an error, the typical action is to
emit an 'error' event. Error events are treated as a special case. If there
is no listener for it, then the default action is for the error to throw.

All EventEmitters emit the event 'newListener' when new listeners are added.

```javascript
var EventEmitter = require('events').EventEmitter;

// create an event emitter
var emitter = new EventEmitter();
```


#### emitter.setMaxListeners(n)

By default EventEmitters will print a warning if more than 10 listeners are
added for a particular event. This is a useful default which helps finding
memory leaks. Obviously not all Emitters should be limited to 10. This
function allows that to be increased. Set to zero for unlimited.

* __n__ - _Number_ - The maximum number of listeners


#### emitter.emit(event, [arg1], [arg2], [...])

Execute each of the listeners in order with the supplied arguments.

* __event__ - _String_ - The event name/id to fire


#### emitter.on(event, listener) | emitter.addListener(event, listener)

Adds a listener to the end of the listeners array for the specified event.

* __event__ - _String_ - The event name/id to listen for
* __listener__ - _Function_ - The function to bind to the event

```javascript
session.on('change', function (userCtx) {
    console.log('session changed!');
});
```


#### emitter.once(event, listener)

Adds a one time listener for the event. This listener is invoked only the
next time the event is fired, after which it is removed.

* __event-__ - _String_ - The event name/id to listen for
* __listener__ - _Function_ - The function to bind to the event

```javascript
db.once('unauthorized', function (req) {
    // this event listener will fire once, then be unbound
});
```


#### emitter.removeListener(event, listener)

Remove a listener from the listener array for the specified event. Caution:
changes array indices in the listener array behind the listener.

* __event__ - _String_ - The event name/id to remove the listener from
* __listener__ - _Function_ - The listener function to remove

```javascript
var callback = function (init) {
    console.log('duality app loaded');
};
devents.on('init', callback);
// ...
devents.removeListener('init', callback);
```


#### emitter.removeAllListeners([event])

Removes all listeners, or those of the specified event.

* __event__ - _String_ - Event name/id to remove all listeners for (optional)


#### emitter.listeners(event)

Returns an array of listeners for the specified event. This array can be
manipulated, e.g. to remove listeners.

* __events__ - _String_ - The event name/id to return listeners for

```javascript
session.on('change', function (stream) {
    console.log('session changed');
});
console.log(util.inspect(session.listeners('change'))); // [ [Function] ]
```
