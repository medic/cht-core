import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { GetSubjectSummariesService } from '@mm-services/get-subject-summaries.service';
import { DbService } from '@mm-services/db.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { GetSummariesService } from '@mm-services/get-summaries.service';

describe('GetSubjectSummaries service', () => {
  let service:GetSubjectSummariesService;
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
      reportSubjects: sinon.stub().resolves([{ _id: 'lid', doc: doc, lineage: lineage }])
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: sinon.stub().returns({ query }) } },
        { provide: GetSummariesService, useValue: { get: GetSummaries } },
        { provide: LineageModelGeneratorService, useValue: LineageModelGenerator },
      ]
    });

    service = TestBed.inject(GetSubjectSummariesService);
  });

  afterEach(() => {
    sinon.restore();
  });


  it('returns empty array when given no summaries', () => {
    return service.get([]).then(actual => {
      expect(actual).to.deep.equal([]);
    });
  });

  it('does nothing when input has no `form` (not a report)', () => {
    const given = [
      { id: 'a', type: 'person' }
    ];

    return service.get(given).then(actual => {
      expect(actual).to.deep.equal(given);
      expect(query.callCount).to.equal(0);
      expect(GetSummaries.callCount).to.equal(0);
    });
  });

  it('does nothing when summaries not found', () => {
    const given = [
      { form: 'a', subject: { type: 'reference', value: '12345' } },
      { form: 'a', subject: { type: 'id', value: 'a' } }
    ];

    query.resolves({ rows: [] });
    GetSummaries.resolves([]);
    return service.get(given).then(actual => {
      expect(actual).to.deep.equal(given);
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

    query.resolves({ rows: contactReferences });
    GetSummaries.resolves([]);

    return service.get(given).then(actual => {
      expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: 'a'
        },
        validSubject: false
      });

      expect(actual[1]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: 'b'
        },
        validSubject: false
      });

      expect(actual[2]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: '11111'
        },
        validSubject: false
      });

      expect(query.callCount).to.equal(1);
      expect(GetSummaries.callCount).to.equal(1);
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

    GetSummaries.resolves(summaries);
    return service.get(given).then(actual => {
      expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'a',
          type: 'name',
          value: 'tom'
        },
        validSubject: true
      });

      expect(actual[1]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'b',
          type: 'name',
          value: 'helen'
        },
        validSubject: true
      });

      expect(actual[2]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: 'c'
        },
        validSubject: false
      });
      expect(query.callCount).to.equal(0);
      expect(GetSummaries.callCount).to.equal(1);
    });
  });

  it('returns provided `name`', () => {
    const given = [
      { form: 'a', subject: { type: 'name', value: 'tom' } },
    ];

    return service.get(given).then(actual => {
      expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'name',
          value: 'tom'
        },
        validSubject: true
      });
      expect(query.callCount).to.equal(0);
      expect(GetSummaries.callCount).to.equal(0);
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

    query.resolves({ rows: contactReferences });
    GetSummaries.resolves(summaries);

    return service.get(given).then(actual => {
      expect(actual[0]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'a',
          type: 'name',
          value: 'tom'
        },
        validSubject: true
      });

      expect(actual[1]).to.deep.equal({
        form: 'a',
        subject: {
          _id: 'b',
          type: 'name',
          value: 'helen'
        },
        validSubject: true
      });

      expect(actual[2]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: 'c'
        },
        validSubject: false
      });

      expect(actual[3]).to.deep.equal({
        form: 'a',
        subject: {
          type: 'id',
          value: '11111'
        },
        validSubject: false
      });

      expect(query.callCount).to.equal(1);
      expect(GetSummaries.callCount).to.equal(1);
    });

  });

  it('uses `contact.name` or `from` when subject is empty', () => {
    const given = [
      { form: 'a', contact: 'tom', subject: {} },
      { form: 'a', from: 'helen', subject: {} }
    ];

    return service.get(given).then(actual => {
      expect(actual[0]).to.deep.equal({
        form: 'a',
        contact: 'tom',
        subject: {
          value: 'tom'
        },
        validSubject: true
      });

      expect(actual[1]).to.deep.equal({
        form: 'a',
        from: 'helen',
        subject: {
          value: 'helen'
        },
        validSubject: true
      });

      expect(query.callCount).to.equal(0);
      expect(GetSummaries.callCount).to.equal(0);
    });
  });

  it('invalidates subject when info is missing', () => {
    const given = [
      { form: 'a', contact: 'a', subject: { type: 'reference', value: null } },
      { form: 'a', contact: 'b', subject: { type: 'name', value: null } },
      { form: 'a', contact: 'c', subject: { type: 'id', value: null } }
    ];

    query.resolves({ rows: [] });
    return service.get(given).then(actual => {
      expect(actual[0]).to.deep.equal({
        form: 'a',
        contact: 'a',
        subject: {
          type: 'reference',
          value: null
        },
        validSubject: false
      });

      expect(actual[1]).to.deep.equal({
        form: 'a',
        contact: 'b',
        subject: {
          type: 'name',
          value: null
        },
        validSubject: false
      });

      expect(actual[2]).to.deep.equal({
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

    query.resolves({ rows: contactReferences });
    GetSummaries.resolves(summaries);

    return service.get(given, true).then(actual => {
      expect(actual[0]).to.deep.equal({
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

      expect(query.callCount).to.equal(1);
      expect(GetSummaries.callCount).to.equal(1);
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

    query.resolves({ rows: contactReferences });
    GetSummaries.resolves(summaries);

    return service.get(given).then(actual => {
      expect(actual[0]).to.deep.equal({
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

      expect(query.callCount).to.equal(1);
      expect(GetSummaries.callCount).to.equal(1);
    });
  });
});
