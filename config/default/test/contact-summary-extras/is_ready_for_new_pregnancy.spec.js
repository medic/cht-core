const { expect } = require('chai');
const moment = require('moment');
const { isReadyForNewPregnancy } = require('../../contact-summary-extras');

describe('isReadyForNewPregnancy()', () => {
  const person = { type: 'person' };

  // Parent rule (H1 / #9285 / #6047): after pregnancy + newer delivery,
  // pregnancy registration should be allowed once delivery is more than 6 weeks ago.
  it('returns true when pregnancy was followed by a delivery more than 6 weeks ago', () => {
    const pregnancyReported = moment().subtract(8, 'months');
    const deliveryReported = moment().subtract(8, 'weeks');

    const pregnancy = {
      form: 'pregnancy',
      reported_date: pregnancyReported.valueOf(),
      fields: {
        lmp_date_8601: pregnancyReported.clone().subtract(2, 'months').format('YYYY-MM-DD')
      }
    };

    const delivery = {
      form: 'delivery',
      reported_date: deliveryReported.valueOf(),
      fields: {
        delivery_outcome: {
          delivery_date: deliveryReported.format('YYYY-MM-DD')
        }
      }
    };

    expect(isReadyForNewPregnancy(person, [pregnancy, delivery])).to.equal(true);
  });
});
