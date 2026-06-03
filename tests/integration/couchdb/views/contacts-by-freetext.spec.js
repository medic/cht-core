const utils = require('@utils');
const nouveau = require('@medic/nouveau');
const { expect } = require('chai');

describe('contacts_by_freetext', () => {
  let ids;

  // A value longer than maxLength (1000) in the index function. It is also longer than Lucene's
  // 32766-byte single-term limit.
  const longMarker = 'fxtlongtoken';
  const longValue = longMarker + 'a'.repeat(40000);

  const documentsToReturn = [
    {
      // Short custom contact_type must still be indexed
      _id: 'fxt_contact_short_type',
      type: 'contact',
      contact_type: 'hh',
      name: 'fxtshorttype',
    },
    {
      // Field value within the length limit is indexed for exact match.
      _id: 'fxt_contact_short_field',
      type: 'person',
      name: 'fxtshortfield',
      phone: 'fxtphonenumber',
    },
    {
      // Field value over the length limit is skipped for exact match, but the contact is still indexed
      _id: 'fxt_contact_long_field',
      type: 'person',
      name: 'fxtlongfield',
      note: longValue,
    },
  ];

  const queryFreetext = async (q) => {
    const body = { q, limit: nouveau.RESULTS_LIMIT };
    const response = await utils.requestOnTestDb({
      path: '/_design/medic/_nouveau/contacts_by_freetext',
      method: 'POST',
      body,
    });
    return response.hits.map(hit => hit.id);
  };

  before(async () => {
    await utils.saveDocs(documentsToReturn);
    ids = await queryFreetext('fxt*');
  }, 5 * 60 * 1000);

  it('should index a short custom contact_type', async () => {
    const result = await queryFreetext('contact_type:"hh"');
    expect(result).to.include('fxt_contact_short_type');
  });

  it('should index field values within the length limit for exact match', async () => {
    const exact = await queryFreetext('exact_match:"phone:fxtphonenumber"');
    expect(exact).to.include('fxt_contact_short_field');

    const fuzzy = await queryFreetext('fxtphonenumber*');
    expect(fuzzy).to.include('fxt_contact_short_field');
  });

  it('should not index over-length field values for exact match', async () => {
    const result = await queryFreetext(`exact_match:"note:${longValue}"`);
    expect(result).to.not.include('fxt_contact_long_field');
  });

  it('should still index a contact that has an over-length field', async () => {
    expect(ids).to.include('fxt_contact_long_field');
    const byName = await queryFreetext('fxtlongfield*');
    expect(byName).to.include('fxt_contact_long_field');
  });

  it('should not break the tokenized default index with an over-length field', async () => {
    const result = await queryFreetext(`${longMarker}*`);
    expect(result).to.include('fxt_contact_long_field');
  });
});
