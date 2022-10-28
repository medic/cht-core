const smsparser = require('../../../../src/services/report/smsparser');
const chai = require('chai');
const moment = require('moment');

const def = {
  meta: {
    code: 'ANCR'
  },
  fields: {
    name: {
      labels: {
        short: 'Name',
        tiny: 'N'
      },
      type: 'string'
    },
    lmp: {
      labels: {
        short: 'LMP',
        tiny: 'LMP'
      },
      type: 'integer'
    },
    somedate: {
      labels: {
        short: 'Date',
        tiny: 'D'
      },
      type: 'date'
    }
  }
};

describe('sms parser compact', () => {

  it('compact textforms format', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR sarah 24 2012-03-12'
    };

    const expectedObj = {
      name: 'sarah',
      lmp: 24,
      somedate: moment('2012-03-12').valueOf()
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('compact textforms format with hash separated form code', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR#sarah'
    };

    const expectedObj = {
      name: 'sarah'
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('compact textforms format with exclaimation separated form code', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR!sarah'
    };

    const expectedObj = {
      name: 'sarah'
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('compact textforms format with hyphen separated form code', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR-sarah'
    };

    const expectedObj = {
      name: 'sarah'
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('compact textforms format uses quotes for multiple words', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR "Sarah Connor" 24 2012-03-12'
    };

    const expectedObj = {
      name: 'Sarah Connor',
      lmp: 24,
      somedate: moment('2012-03-12').valueOf()
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('compact textforms format handles quotes in quotes', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR "Sarah "killer bee" Connor" 24 2012-03-12'
    };
    const expectedObj = {
      name: 'Sarah "killer bee" Connor',
      lmp: 24,
      somedate: moment('2012-03-12').valueOf()
    };
    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('compact textforms handles too few fields', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR "Sarah Connor" 24'
    };

    const expectedObj = {
      name: 'Sarah Connor',
      lmp: 24
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });


  it('compact textforms handles too many fields', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR "Sarah Connor" 24 2012-03-12 comment'
    };

    const expectedObj = {
      name: 'Sarah Connor',
      lmp: 24,
      somedate: moment('2012-03-12').valueOf()
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('if last field is a string then quotes are optional', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'CHAT sarah reduced fetal movements'
    };
    const def = {
      meta: {
        code: 'CHAT'
      },
      fields: {
        name: {
          labels: {
            short: 'Name',
            tiny: 'N'
          },
          type: 'string'
        },
        comment: {
          labels: {
            short: 'Comment',
            tiny: 'C'
          },
          type: 'string'
        }
      }
    };

    const expectedObj = {
      name: 'sarah',
      comment: 'reduced fetal movements'
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('compact textforms handles mismatched types', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'ANCR sarah abc 2012-03-12'
    };

    const expectedObj = {
      name: 'sarah',
      lmp: null,
      somedate: moment('2012-03-12').valueOf()
    };

    const obj = smsparser.parse(def, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

  it('compact textforms handles registrations starting with N', () => {
    const doc = {
      sent_timestamp: '1-13-12 15:35',
      from: '+15551212',
      message: 'R North West'
    };

    const defR = {
      meta: {
        code: 'R'
      },
      fields: {
        name: {
          labels: {
            short: 'Name',
            tiny: 'N'
          },
          type: 'string'
        }
      }
    };

    const expectedObj = {
      name: 'North West'
    };

    const obj = smsparser.parse(defR, doc);
    chai.expect(obj).to.deep.equal(expectedObj);
  });

});
