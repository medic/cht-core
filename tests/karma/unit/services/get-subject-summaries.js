describe('GetSubjectSummaries service', () => {

  'use strict';

  let service,
    query;

  beforeEach(() => {
    query = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject($injector => service = $injector.get('GetSubjectSummaries'));
  });

  afterEach(() => {
    KarmaUtils.restore(query);
  });

  it('returns empty array when given no summaries', () => {
    return service([]).then(actual => {
      chai.expect(actual).to.deep.equal([]);
    });
  });

  it('does nothing when input has no `subject` (not a report)', () => {
    const given = [
      { id: 'a', type: 'person' }
    ];

    query.returns(Promise.resolve({ rows: [] }));
    return service(given).then(actual => {
      chai.expect(actual).to.deep.equal(given);
      chai.expect(query.callCount).to.equal(0);
    });
  });

  it('does nothing when summaries not found', () => {
    const given = [
      { subject: { type: 'patient_id', value: '12345' } },
      { subject: { type: 'uuid', value: 'a' } }
    ];

    query.returns(Promise.resolve({ rows: [] }));
    return service(given).then(actual => {
      chai.expect(actual).to.deep.equal(given);
    });
  });

  it('replaces `patient_ids` with `uuids`', () => {
    const given = [
      { subject: { type: 'patient_id', value: '12345' } },
      { subject: { type: 'patient_id', value: '67890' } },
      { subject: { type: 'patient_id', value: '11111' } }
    ];

    const contactReferences = [
      { id: 'a', key: ['shortcode', '12345'] },
      { id: 'b', key: ['shortcode', '67890'] }
    ];

    query
      .withArgs('medic-client/contacts_by_reference')
      .returns(Promise.resolve({ rows: contactReferences }));
    query
      .withArgs('medic-client/doc_summaries_by_id')
      .returns(Promise.resolve({ rows: [] }));

    return service(given).then(actual => {
      chai.expect(actual[0].subject.value).to.equal('a');
      chai.expect(actual[1].subject.value).to.equal('b');
      chai.expect(actual[2].subject.value).to.equal('11111');
      chai.expect(actual[0].valid_subject).to.equal(false);
      chai.expect(actual[1].valid_subject).to.equal(false);
      chai.expect(actual[1].valid_subject).to.equal(false);
      chai.expect(query.callCount).to.equal(2);
    });
  });

  it('replaces `uuids` with names', () => {
    const given = [
      { subject: { type: 'uuid', value: 'a' } },
      { subject: { type: 'uuid', value: 'b' } },
      { subject: { type: 'uuid', value: 'c' } }
    ];

    const summaries = [
      {id: 'a', value: { name: 'tom' } },
      {id: 'b', value: { name: 'helen' } }
    ];

    query.returns(Promise.resolve({ rows: summaries }));
    return service(given).then(actual => {
      chai.expect(actual[0].subject.value).to.equal('tom');
      chai.expect(actual[1].subject.value).to.equal('helen');
      chai.expect(actual[2].subject.value).to.equal('c');
      chai.expect(actual[2].subject.type).to.equal('uuid');
      chai.expect(actual[0].valid_subject).to.equal(true);
      chai.expect(actual[1].valid_subject).to.equal(true);
      chai.expect(actual[2].valid_subject).to.equal(false);
      chai.expect(query.callCount).to.equal(1);
    });
  });

  it('returns provided `patient_name`', () => {
    const given = [
      { subject: { type: 'patient_name', value: 'tom' } },
    ];

    query.returns(Promise.resolve({ rows: [] }));
    return service(given).then(actual => {
      chai.expect(actual[0].subject).to.deep.equal({ type: 'patient_name', value: 'tom' });
      chai.expect(actual[0].valid_subject).to.equal(true);
      chai.expect(query.callCount).to.equal(0);
    });
  });

  it('replaces `patient_ids` with `names`', () => {
    const given = [
      { subject: { type: 'patient_id', value: '12345' } },
      { subject: { type: 'patient_id', value: '56789' } },
      { subject: { type: 'patient_id', value: '00000' } },
      { subject: { type: 'patient_id', value: '11111' } },
    ];

    const contactReferences = [
      { key: ['shortcode', '12345'], id: 'a' },
      { key: ['shortcode', '56789'], id: 'b' },
      { key: ['shortcode', '00000'], id: 'c' }
    ];

    const summaries = [
      {id: 'a', value: { name: 'tom' } },
      {id: 'b', value: { name: 'helen' } }
    ];

    query
      .withArgs('medic-client/contacts_by_reference')
      .returns(Promise.resolve({ rows: contactReferences }));
    query
      .withArgs('medic-client/doc_summaries_by_id')
      .returns(Promise.resolve({ rows: summaries }));

    return service(given).then(actual => {
      chai.expect(actual[0].subject.value).to.equal('tom');
      chai.expect(actual[1].subject.value).to.equal('helen');
      chai.expect(actual[2].subject.value).to.equal('c');
      chai.expect(actual[2].subject.type).to.equal('uuid');
      chai.expect(actual[3].subject.value).to.equal('11111');
      chai.expect(actual[3].subject.type).to.equal('patient_id');
      chai.expect(actual[0].valid_subject).to.equal(true);
      chai.expect(actual[1].valid_subject).to.equal(true);
      chai.expect(actual[2].valid_subject).to.equal(false);
      chai.expect(actual[3].valid_subject).to.equal(false);
      chai.expect(query.callCount).to.equal(2);
    });

  });

  it('uses `contact.name` or `from` when subject is empty', () => {
    const given = [
      { contact: 'tom', subject: {} },
      { from: 'helen', subject: {} }
    ];

    query.returns(Promise.resolve({ rows: [] }));
    return service(given).then(actual => {
      chai.expect(actual[0].subject.value).to.equal('tom');
      chai.expect(actual[1].subject.value).to.equal('helen');
      chai.expect(query.callCount).to.equal(0);
      chai.expect(actual[0].valid_subject).to.equal(true);
      chai.expect(actual[1].valid_subject).to.equal(true);
    });
  });

  it('invalidates subject when info is missing', () => {
    const given = [
      { contact: 'a', subject: { type: 'patient_id', value: null } },
      { contact: 'b', subject: { type: 'patient_name', value: null } },
      { contact: 'c', subject: { type: 'uuid', value: null } }
    ];

    query.returns(Promise.resolve({ rows: [] }));
    return service(given).then(actual => {
      chai.expect(actual[0].subject.value).to.be.a('null');
      chai.expect(actual[1].subject.value).to.be.a('null');
      chai.expect(actual[2].subject.value).to.be.a('null');

      chai.expect(actual[0].valid_subject).to.equal(false);
      chai.expect(actual[1].valid_subject).to.equal(false);
      chai.expect(actual[2].valid_subject).to.equal(false);
    });
  });
});
