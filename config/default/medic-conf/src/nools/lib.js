/* global c, emit, Task, Target */

var tasks = require('tasks.js');
var targets = require('targets.js');

var taskEmitter = require('./task-emitter'); 
var targetEmitter = require('./target-emitter');

targetEmitter(targets, c, Utils, Target, emit);
taskEmitter(tasks, c, Utils, Task, emit);

emit('_complete', { _id: true });
