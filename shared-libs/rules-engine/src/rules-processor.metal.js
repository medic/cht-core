/**
 * @module rules-processor.metal
 * Processes declarative configuration code in an identical manner to nools (but without nools)
 */

class Contact {
  constructor({ contact, reports, tasks}) {
    this.contact = contact;
    this.reports = reports;
    this.tasks = tasks;
  }
};
Contact.prototype.tasks = 'foo';

const Task = class { constructor(x) { Object.assign(this, x); }};
const Target = class { constructor(x) { Object.assign(this, x); }};

let processContainer;
const results = { tasks: [], targets: [] };

module.exports = {
  getContact: () => Contact,
  initialize: (settings, scope) => {
    let rules = settings.rules.replace(/define.*\} then \{ /s, '');
    rules = rules.substring(0, rules.length - 3);
    
    const rulesFunction = new Function('c', 'Task', 'Target', 'Utils', 'user', 'cht', 'emit', rules);
    processContainer = container => {
      return rulesFunction(container, Task, Target, scope.Utils, scope.user, scope.cht, emitCallback);
    };
    return true;
  },

  startSession: () => {
    if (!processContainer) {
      throw Error('Failed to start task session. Not initialized');
    }

    results.tasks = [];
    results.targets = [];
    
    return {
      processContainer,
      result: () => Promise.resolve(results),
      dispose: () => {},
    };
  },

  isLatestNoolsSchema: () => {
    if (!processContainer) {
      throw Error('task emitter is not enabled -- cannot determine schema version');
    }

    return true;
  },

  shutdown: () => {
    processContainer = undefined;
  },
};

const emitCallback = (instanceType, instance) => {
  if (instanceType === 'task') {
    results.tasks.push(instance);
  } else if (instanceType === 'target') {
    results.targets.push(instance);
  }
};
