const assert = chai.assert;

describe('ContactSave service', () => {

  let service;
  let bulkDocs;
  let EnketoTranslation;
  let ExtractLineage;

  beforeEach(() => {
    EnketoTranslation = {
      contactRecordToJs: sinon.stub(),
    };

    ExtractLineage = sinon.stub().returnsArg(0);
    bulkDocs = sinon.stub();

    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({ bulkDocs: bulkDocs }));
      $provide.value('EnketoTranslation', EnketoTranslation);
      $provide.value('ExtractLineage', ExtractLineage);
    });
    inject(_ContactSave_ => {
      service = _ContactSave_;
    });
  });

  it('should include parent ID in repeated children', () => {

    // given
    const schema = { fields: { sis: { type: 'db:sister' } } };
    const form = { getDataStr: () => '<data></data>' };
    const docId = null;
    const type = 'some-contact-type';

    EnketoTranslation.contactRecordToJs.returns({
      doc: { _id: 'main1', type: 'main', sis: 'NEW', },
      siblings: {
        sis: { _id: 'sis1', type: 'sister', parent: 'PARENT', },
      },
      repeats: {
        child_data: [ { _id: 'kid1', type: 'child', parent: 'PARENT', } ],
      },
    });

    bulkDocs.returns(Promise.resolve());

    // when
    return service(schema, form, docId, type)
      .then(() => {

        // then
        assert.isTrue(bulkDocs.calledOnce);

        const savedDocs = bulkDocs.args[0][0];

        assert.equal(savedDocs[0]._id, 'kid1');
        assert.equal(savedDocs[0].parent._id, 'main1');

        assert.equal(savedDocs[1]._id, 'sis1');
        assert.equal(savedDocs[1].parent._id, 'main1');

        assert.equal(savedDocs[2]._id, 'main1');

        assert(ExtractLineage.calledOnce);
      });
  });

});
