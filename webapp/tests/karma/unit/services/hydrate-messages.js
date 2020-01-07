describe('HydrateMessages service', () => {

  'use strict';

  let service;
  let query;
  let lineageModelGenerator;

  const contact = { _id: 'contact', name: 'aa' };

  const lineage = [
    { id: 1, name: 'bb' },
    { id: 2, name: 'cc' }];

  beforeEach(() => {
    query = sinon.stub();
    lineageModelGenerator = {
      reportSubjects: sinon.stub()
    };
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.value('LineageModelGenerator', lineageModelGenerator);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject($injector => service = $injector.get('HydrateMessages'));
  });

  afterEach(() => {
    KarmaUtils.restore(query);
  });

  it('returns empty array when given no data', () => {
    return service([]).then(actual => {
      chai.expect(actual).to.deep.equal([]);
    });
  });

  it('hydrates outgoing message', () => {
    const doc = {
      _id: 12345,
      kujua_message: true,
      tasks: [{messages: [{contact: contact, message: 'hello', phone: '+123'}]}]
    };
    const given = [{
      doc: doc,
      key: [contact._id],
      value: {
        id: 1234,
        date: 123456789
      }
    }];
    const expected = [{
      doc: doc,
      id: doc._id,
      key: contact._id,
      contact: contact.name,
      lineage: _.map(lineage, 'name'),
      outgoing: true,
      from: contact._id,
      date: given[0].value.date,
      type: 'contact',
      message: doc.tasks[0].messages[0].message
    }];

    query.returns(Promise.resolve({ rows: [] }));
    lineageModelGenerator.reportSubjects.returns(Promise.resolve([{
      _id: contact._id, doc: contact, lineage: lineage
    }]));
    return service(given).then(actual => {
      chai.expect(actual).to.deep.equal(expected);
    });
  });

  it('hydrates incoming message', () => {
    const doc = {
      _id: 12345,
      sms_message: { message: 'hello'}
    };
    const given = [{
      doc: doc,
      key: [contact._id],
      value: {
        id: 1234,
        date: 123456789
      }
    }];
    const expected = [{
      doc: doc,
      id: doc._id,
      key: contact._id,
      contact: contact.name,
      lineage: _.map(lineage, 'name'),
      outgoing: false,
      from: doc._id,
      date: given[0].value.date,
      type: 'unknown',
      message: doc.sms_message.message
    }];

    query.returns(Promise.resolve({ rows: [] }));
    lineageModelGenerator.reportSubjects.returns(Promise.resolve([{
      _id: contact._id, doc: contact, lineage: lineage
    }]));
    return service(given).then(actual => {
      chai.expect(actual).to.deep.equal(expected);
    });
  });
});
