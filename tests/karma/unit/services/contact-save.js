const assert = chai.assert;

describe('ContactSave service', () => {

  let service;
  let bulkDocs;
  let get;
  let EnketoTranslation;
  let ExtractLineage;

  beforeEach(() => {
    EnketoTranslation = {
      contactRecordToJs: sinon.stub(),
    };

    ExtractLineage = sinon.stub();
    bulkDocs = sinon.stub();
    get = sinon.stub();

    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({
        bulkDocs: bulkDocs,
        get: get
      }));
      $provide.value('EnketoTranslation', EnketoTranslation);
      $provide.value('ExtractLineage', ExtractLineage);
    });
    inject(_ContactSave_ => {
      service = _ContactSave_;
    });
  });

  it('fetches and binds db types and minifies string contacts', () => {

    // given
    const schema = { fields: { contact: { type: 'db:person' } } };
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    EnketoTranslation.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: 'abc' }
    });
    bulkDocs.returns(Promise.resolve());
    get.returns(Promise.resolve({ _id: 'abc', name: 'gareth', parent: { _id: 'def' } }));
    ExtractLineage.returns({ _id: 'abc', parent: { _id: 'def' } });

    // when
    return service(schema, form, docId, type)
      .then(() => {

        // then
        assert.equal(get.callCount, 1);
        assert.equal(get.args[0][0], 'abc');

        assert.equal(bulkDocs.callCount, 1);

        const savedDocs = bulkDocs.args[0][0];

        assert.equal(savedDocs.length, 1);
        assert.deepEqual(savedDocs[0].contact, {
          _id: 'abc',
          parent: {
            _id: 'def'
          }
        });
      });
  });

  it('fetches and binds db types and minifies object contacts', () => {

    // given
    const schema = { fields: { contact: { type: 'db:person' } } };
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    EnketoTranslation.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', contact: { _id: 'abc', name: 'Richard' } }
    });
    bulkDocs.returns(Promise.resolve());
    get.returns(Promise.resolve({ _id: 'abc', name: 'Richard', parent: { _id: 'def' } }));
    ExtractLineage.returns({ _id: 'abc', parent: { _id: 'def' } });

    // when
    return service(schema, form, docId, type)
      .then(() => {

        // then
        assert.equal(get.callCount, 1);
        assert.equal(get.args[0][0], 'abc');

        assert.equal(bulkDocs.callCount, 1);

        const savedDocs = bulkDocs.args[0][0];

        assert.equal(savedDocs.length, 1);
        assert.deepEqual(savedDocs[0].contact, {
          _id: 'abc',
          parent: {
            _id: 'def'
          }
        });
      });
  });

  it('should include parent ID in repeated children', () => {

    // given
    const schema = { fields: { sis: { type: 'db:sister' } } };
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    EnketoTranslation.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', sis: 'NEW', contact: 'this-would-be-the-chw-id'},
      siblings: {
        sis: { _id: 'sis1', type: 'sister', parent: 'PARENT', },
      },
      repeats: {
        child_data: [ { _id: 'kid1', type: 'child', parent: 'PARENT', } ],
      },
    });

    ExtractLineage.callsFake(contact => {
      contact.extracted = true;
      return contact;
    });

    bulkDocs.returns(Promise.resolve());

    // when
    return service(schema, form, docId, type)
      .then(() => {

        // then
        assert.isTrue(bulkDocs.calledOnce);

        const savedDocs = bulkDocs.args[0][0];

        assert.equal(savedDocs[0]._id, 'main1');

        assert.equal(savedDocs[1]._id, 'kid1');
        assert.equal(savedDocs[1].parent._id, 'main1');
        assert.equal(savedDocs[1].parent.extracted, true);

        assert.equal(savedDocs[2]._id, 'sis1');
        assert.equal(savedDocs[2].parent._id, 'main1');
        assert.equal(savedDocs[2].parent.extracted, true);

        assert.equal(ExtractLineage.callCount, 3);
      });
  });

});
