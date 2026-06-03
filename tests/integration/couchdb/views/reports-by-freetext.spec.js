const utils = require('@utils');
const nouveau = require('@medic/nouveau');
const { expect } = require('chai');
const { DOC_TYPES } = require('@medic/constants');

describe('reports_by_freetext', () => {
  let ids;

  // A value longer than maxLength (1000) in the index function. It is also longer than Lucene's
  // 32766-byte single-term limit.
  const longMarker = 'fxtlongtoken';
  const longValue = longMarker + 'a'.repeat(40000);

  const documentsToReturn = [
    {
      // Field value within the length limit is indexed for exact match.
      _id: 'fxt_report_short_field',
      type: DOC_TYPES.DATA_RECORD,
      form: 'F',
      reported_date: 1,
      fields: { patient_name: 'fxtpatientname' },
    },
    {
      // Field value over the length limit is skipped for exact match, but the report is still indexed
      _id: 'fxt_report_long_field',
      type: DOC_TYPES.DATA_RECORD,
      form: 'F',
      reported_date: 1,
      fields: { patient_name: 'fxtlongreport', image: longValue },
    },
  ];

  const queryFreetext = async (q) => {
    const body = { q, limit: nouveau.RESULTS_LIMIT };
    const response = await utils.requestOnTestDb({
      path: '/_design/medic/_nouveau/reports_by_freetext',
      method: 'POST',
      body,
    });
    return response.hits.map(hit => hit.id);
  };

  before(async () => {
    await utils.saveDocs(documentsToReturn);
    ids = await queryFreetext('fxt*');
  }, 5 * 60 * 1000);

  it('should index field values within the length limit for exact match', async () => {
    const exact = await queryFreetext('exact_match:"patient_name:fxtpatientname"');
    expect(exact).to.include('fxt_report_short_field');

    const fuzzy = await queryFreetext('fxtpatientname*');
    expect(fuzzy).to.include('fxt_report_short_field');
  });

  it('should not index over-length field values for exact match', async () => {
    const result = await queryFreetext(`exact_match:"image:${longValue}"`);
    expect(result).to.not.include('fxt_report_long_field');
  });

  it('should still index a report that has an over-length field', async () => {
    expect(ids).to.include('fxt_report_long_field');
    const byField = await queryFreetext('exact_match:"patient_name:fxtlongreport"');
    expect(byField).to.include('fxt_report_long_field');
  });

  it('should not break the tokenized default index with an over-length field', async () => {
    const result = await queryFreetext(`${longMarker}*`);
    expect(result).to.include('fxt_report_long_field');
  });
});
