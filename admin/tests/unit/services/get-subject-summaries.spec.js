describe('GetSubjectSummaries service', () => {

  'use strict';

  let service;
  let query;
  let GetSummaries;
  let LineageModelGenerator;

  const doc = { _id: 'result' };
  const lineage = [
    { _id: '1', name: 'one' },
    { _id: '2', name: 'two' },
    { _id: '3', name: 'three'}
  ];

  beforeEach(() => {
    query = sinon.stub();
    GetSummaries = sinon.stub();
    LineageModelGenerator = {
      reportSubjects: sinon.stub().returns(
        Promise.resolve([{ _id: 'lid', doc: doc, lineage: lineage }])
      )
    };
    module('adminApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('GetSummaries', GetSummaries);
      $provide.value('LineageModelGenerator', LineageModelGenerator);
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

  it('does nothing when input has no `form` (not a report)', () => {
    const given = [
      { id: 'a', type: 'person' }
    ];

    return service(given).then(actual => {
      chai.expect(actual).to.deep.equal(given);
      chai.expect(query.callCount).to.equal(0);
      chai.expect(GetSummaries.callCount).to.equal(0);
    });
  });

  it('does nothing when summaries not found', () => {
    const given = [
      { form: 'a', subject: { type: 'reference', value: '12345' } },
      { form: 'a', subject: { type: 'id', value: 'a' } }
    ];

    query.returns(Promise.resolve({ rows: [] }));
    GetSummaries.returns(Promise.resolve([]));
    return service(given).then(actual => {
      chai.expect(actual).to.deep.equal(given);
    });
  });

  it('replaces `references` with `ids`', () => {
    const given = [
      { form: 'a', subject: { type: 'reference', value: '12345' } },
      { form: 'a', subject: { type: 'reference', value: '67890' } },
      { form: 'a', subject: { type: 'reference', value: '11111' } }
    ];

    const contactReferences = [
      { id: 'a', key: ['shortcode', '12345'] },
      { id: 'b', key: ['shortcode', '67890'] }
    ];

    query.returns(Promise.resolve({ rows: contactReferences }));
    GetSummaries.returns(Promise.resolve([]));

    return service(given).then(actual => {
      chai.expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: 'a'
        },
        validSubject: false
      });

      chai.expect(actual[1]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: 'b'
        },
        validSubject: false
      });

      chai.expect(actual[2]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: '11111'
        },
        validSubject: false
      });

      chai.expect(query.callCount).to.equal(1);
      chai.expect(GetSummaries.callCount).to.equal(1);
    });
  });

  it('replaces `id` with names', () => {
    const given = [
      { form: 'a', subject: { type: 'id', value: 'a' } },
      { form: 'a', subject: { type: 'id', value: 'b' } },
      { form: 'a', subject: { type: 'id', value: 'c' } }
    ];

    const summaries = [
      { _id: 'a', name: 'tom' },
      { _id: 'b', name: 'helen' }
    ];

    GetSummaries.returns(Promise.resolve(summaries));
    return service(given).then(actual => {
      chai.expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'a',
          type: 'name',
          value: 'tom'
        },
        validSubject: true
      });

      chai.expect(actual[1]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'b',
          type: 'name',
          value: 'helen'
        },
        validSubject: true
      });

      chai.expect(actual[2]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: 'c'
        },
        validSubject: false
      });
      chai.expect(query.callCount).to.equal(0);
      chai.expect(GetSummaries.callCount).to.equal(1);
    });
  });

  it('returns provided `name`', () => {
    const given = [
      { form: 'a', subject: { type: 'name', value: 'tom' } },
    ];

    return service(given).then(actual => {
      chai.expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'name',
          value: 'tom'
        },
        validSubject: true
      });
      chai.expect(query.callCount).to.equal(0);
      chai.expect(GetSummaries.callCount).to.equal(0);
    });
  });

  it('replaces `references` with `names`', () => {
    const given = [
      { form: 'a', subject: { type: 'reference', value: '12345' } },
      { form: 'a', subject: { type: 'reference', value: '56789' } },
      { form: 'a', subject: { type: 'reference', value: '00000' } },
      { form: 'a', subject: { type: 'reference', value: '11111' } },
    ];

    const contactReferences = [
      { key: ['shortcode', '12345'], id: 'a' },
      { key: ['shortcode', '56789'], id: 'b' },
      { key: ['shortcode', '00000'], id: 'c' }
    ];

    const summaries = [
      { _id: 'a', name: 'tom' },
      { _id: 'b', name: 'helen' }
    ];

    query.returns(Promise.resolve({ rows: contactReferences }));
    GetSummaries.returns(Promise.resolve(summaries));

    return service(given).then(actual => {
      chai.expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'a',
          type: 'name',
          value: 'tom'
        },
        validSubject: true
      });

      chai.expect(actual[1]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'b',
          type: 'name',
          value: 'helen'
        },
        validSubject: true
      });

      chai.expect(actual[2]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: 'c'
        },
        validSubject: false
      });

      chai.expect(actual[3]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: '11111'
        },
        validSubject: false
      });

      chai.expect(query.callCount).to.equal(1);
      chai.expect(GetSummaries.callCount).to.equal(1);
    });

  });

  it('uses `contact.name` or `from` when subject is empty', () => {
    const given = [
      { form: 'a', contact: 'tom', subject: {} },
      { form: 'a', from: 'helen', subject: {} }
    ];

    return service(given).then(actual => {
      chai.expect(actual[0]).to.deep.equal({
        form: 'a',
        contact: 'tom',
        subject: {
          value: 'tom'
        },
        validSubject: true
      });

      chai.expect(actual[1]).to.deep.equal({
        form: 'a',
        from: 'helen',
        subject: {
          value: 'helen'
        },
        validSubject: true
      });

      chai.expect(query.callCount).to.equal(0);
      chai.expect(GetSummaries.callCount).to.equal(0);
    });
  });

  it('invalidates subject when info is missing', () => {
    const given = [
      { form: 'a', contact: 'a', subject: { type: 'reference', value: null } },
      { form: 'a', contact: 'b', subject: { type: 'name', value: null } },
      { form: 'a', contact: 'c', subject: { type: 'id', value: null } }
    ];

    query.returns(Promise.resolve({ rows: [] }));
    return service(given).then(actual => {
      chai.expect(actual[0]).to.deep.equal({
        form: 'a',
        contact: 'a',
        subject: {
          type: 'reference',
          value: null
        },
        validSubject: false
      });

      chai.expect(actual[1]).to.deep.equal({
        form: 'a',
        contact: 'b',
        subject: {
          type: 'name',
          value: null
        },
        validSubject: false
      });

      chai.expect(actual[2]).to.deep.equal({
        form: 'a',
        contact: 'c',
        subject: {
          type: 'id',
          value: null
        },
        validSubject: false
      });
    });
  });

  it('hydrates subject lineage', () => {
    const given = [
      { form: 'a', subject: { type: 'reference', value: '12345' } },
    ];

    const contactReferences = [
      { key: ['shortcode', '12345'], id: 'lid' },
    ];

    const summaries = [
      { _id: 'lid', name: 'tom' },
    ];

    query.returns(Promise.resolve({ rows: contactReferences }));
    GetSummaries.returns(Promise.resolve(summaries));

    return service(given, true).then(actual => {
      chai.expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'lid',
          type: 'name',
          value: 'tom',
          lineage: lineage,
          doc: doc
        },
        validSubject: true
      });

      chai.expect(query.callCount).to.equal(1);
      chai.expect(GetSummaries.callCount).to.equal(1);
    });
  });

  it('compacts subject lineage', () => {
    const given = [
      { form: 'a', subject: { type: 'reference', value: '12345' } },
    ];

    const contactReferences = [
      { key: ['shortcode', '12345'], id: 'lid' },
    ];

    const summaries = [
      { _id: 'lid', name: 'tom' },
    ];

    query.returns(Promise.resolve({ rows: contactReferences }));
    GetSummaries.returns(Promise.resolve(summaries));

    return service(given).then(actual => {
      chai.expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'lid',
          type: 'name',
          value: 'tom',
          doc: doc,
          lineage: ['one', 'two', 'three']
        },
        validSubject: true
      });

      chai.expect(query.callCount).to.equal(1);
      chai.expect(GetSummaries.callCount).to.equal(1);
    });
  });
});
