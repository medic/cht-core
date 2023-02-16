/**
 * @module rules-processor.metal
 * Processes declarative configuration code without nools
 */

class Contact {
  constructor({ contact, reports, tasks}) {
    this.contact = contact;
    this.reports = reports;
    this.tasks = tasks;
  }
}

// required by marshalDocsByContact
Contact.prototype.tasks = 'defined';

class Task {
  constructor(x) {
    Object.assign(this, x);
  }
}

class Target {
  constructor(x) {
    Object.assign(this, x);
  }
}

let processDocsByContact;
const results = { tasks: [], targets: [] };

module.exports = {
  getContact: () => Contact,
  initialize: (settings, scope) => {
    const rules = removeNoolsLanguage(settings.rules);
    const rawFunction = new Function('c', 'Task', 'Target', 'Utils', 'user', 'cht', 'emit', rules);
    processDocsByContact = container => rawFunction(
      container,
      Task,
      Target,
      scope.Utils,
      scope.user,
      scope.cht,
      emitCallback,
    );
    return true;
  },

  startSession: () => {
    if (!processDocsByContact) {
      throw Error('Failed to start task session. Not initialized');
    }

    results.tasks = [];
    results.targets = [];
    
    return {
      processDocsByContact,
      result: () => Promise.resolve(results),
      dispose: () => {},
    };
  },

  isLatestNoolsSchema: () => true,

  shutdown: () => {
    processDocsByContact = undefined;
  },
};

const emitCallback = (instanceType, instance) => {
  if (instanceType === 'task') {
    results.tasks.push(instance);
  } else if (instanceType === 'target') {
    results.targets.push(instance);
  }
};

/*
cht-conf compiles declarative configuration code and wraps it in a "nools rules language" template
This nools code is not valid javascript and must be removed
*/
const removeNoolsLanguage = rules => {
  const noolsRuleLangaugeRegex = /^define.*\} then \{ /s;
  if (noolsRuleLangaugeRegex.test(rules)) {
    let result = rules.replace(noolsRuleLangaugeRegex, '');
    result = result.substring(0, result.length - '\n};'.length);
    return result;
  }

  return rules;
};
