/**
 * @module rules-processor.nools
 * Encapsulates interactions with the nools library
 * Promisifies the execution of partner "rules" code
 * Ensures memory allocated by nools is freed after each run
 */
const nools = require('nools');

let flow;

const startSession = function() {
  if (!flow) {
    throw Error('Failed to start task session. Not initialized');
  }

  const session = flow.getSession();
  const tasks = [];
  const targets = [];
  session.on('task', task => tasks.push(task));
  session.on('target', target => targets.push(target));

  return {
    assert: session.assert.bind(session),
    dispose: session.dispose.bind(session),

    // session.match can return a thenable but not a promise. so wrap it in a real promise
    match: () => new Promise((resolve, reject) => {
      session.match(err => {
        session.dispose();
        if (err) {
          return reject(err);
        }

        resolve({ tasks, targets });
      });
    }),
  };
};

module.exports = {
  getContact: () => flow.getDefined('contact'),
  initialize: (settings, scope) => {
    flow = nools.compile(settings.rules, {
      name: 'medic',
      scope,
    });

    return !!flow;
  },
  startSession: () => {
    const session = startSession();
    return {
      processDocsByContact: session.assert,
      dispose: session.dispose,
      result: session.match,
    };
  },

  /**
   * When upgrading to version 3.8, partners are required to make schema changes in their partner code
   * https://docs.communityhealthtoolkit.org/core/releases/3.8.0/#breaking-changes
   *
   * @returns True if the schema changes are in place
   */
  isLatestNoolsSchema: () => {
    if (!flow) {
      throw Error('task emitter is not enabled -- cannot determine schema version');
    }

    const Task = flow.getDefined('task');
    const Target = flow.getDefined('target');
    const hasProperty = (obj, attr) => Object.hasOwnProperty.call(obj, attr);
    return hasProperty(Task.prototype, 'readyStart') &&
      hasProperty(Task.prototype, 'readyEnd') &&
      hasProperty(Target.prototype, 'contact');
  },

  shutdown: () => {
    nools.deleteFlows();
    flow = undefined;
  },
};
