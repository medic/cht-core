const sinon = require('sinon');

const utils = require('./utils');

describe('emit-complete', function() {
  beforeEach(async () => {
    await utils.initDb([]);
  });

  afterEach(() => {
    utils.tearDown();
    sinon.restore();
  });

  it('should do nothing when tasks not configured', function() {
    // given
    return utils.initSettings({ tasks: { rules: '' } })

      // when
      .then(function() {
        return utils.runMigration('emit-complete');
      })

      // then
      .then(function() {
        return utils.getSettings();
      })
      .then(function(doc) {
        if (doc.settings.tasks.rules) {
          throw new Error('`tasks.rules` should be empty');
        }
      });
  });

  it('should do nothing when _complete emit exists', function() {
    const rules = `
      define Target {  _id: null,  deleted: null,  type: null,  pass: null,  date: null}
      define Contact {  contact: null,  reports: null}
      define Task {  _id: null,  deleted: null,  doc: null,  contact: null,  icon: null,
        date: null,  title: null,  fields: null,  resolved: null,  priority: null,  priorityLabel: null,
        reports: null,  actions: null}
      rule GenerateEvents {  when {    c: Contact  }  then {    emit('_complete', { _id: true });  }}`;

    return utils.initSettings({ tasks: { rules: rules } })

      // when
      .then(function() {
        return utils.runMigration('emit-complete');
      })

      // then
      .then(function() {
        return utils.getSettings();
      })
      .then(function(doc) {
        if (doc.settings.tasks.rules !== rules) {
          throw new Error('`tasks.rules` should not be changed');
        }
      });
  });

  it('should append emit to task configuration', function() {
    const rules = `
      define Target {  _id: null,  deleted: null,  type: null,  pass: null,  date: null}
      define Contact {  contact: null,  reports: null}
      define Task {  _id: null,  deleted: null,  doc: null,  contact: null,  icon: null,  date: null,  title: null,
        fields: null,  resolved: null,  priority: null,  priorityLabel: null,  reports: null,  actions: null}
      rule GenerateEvents {  when {    c: Contact  }
        then {    emit("task", { _id: 1 });  }}
    `;
    const expected = `
      define Target {  _id: null,  deleted: null,  type: null,  pass: null,  date: null}
      define Contact {  contact: null,  reports: null}
      define Task {  _id: null,  deleted: null,  doc: null,  contact: null,  icon: null,  date: null,  title: null,
        fields: null,  resolved: null,  priority: null,  priorityLabel: null,  reports: null,  actions: null}
      rule GenerateEvents {  when {    c: Contact  }
        then {    emit("task", { _id: 1 });   emit('_complete', { _id: true });}}
    `;

    return utils.initSettings({ tasks: { rules: rules } })

      // when
      .then(function() {
        return utils.runMigration('emit-complete');
      })

      // then
      .then(function() {
        return utils.getSettings();
      })
      .then(function(doc) {
        if (doc.settings.tasks.rules !== expected) {
          throw new Error(
            '`tasks.rules` should have _complete emit call appended, \nACTUAL:   ' +
            doc.settings.tasks.rules + '\nEXPECTED: ' + expected
          );
        }
      });
  });

});
