const smsparser = require('../../../../services/report/smsparser');
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

exports['compact textforms format'] = test => {
  const doc = {
    sent_timestamp: '1-13-12 15:35',
    from: '+15551212',
    message: 'ANCR sarah 24 2012-03-12'
  };

  const expectedObj = {
    name: 'sarah',
    lmp: 24,
    somedate: 1331510400000
  };

  const obj = smsparser.parse(def, doc);
  test.same(obj, expectedObj);
  test.done();
};

exports['compact textforms format with hash separated form code'] = test => {
  const doc = {
    sent_timestamp: '1-13-12 15:35',
    from: '+15551212',
    message: 'ANCR#sarah'
  };

  const expectedObj = {
    name: 'sarah'
  };

  const obj = smsparser.parse(def, doc);
  test.same(obj, expectedObj);
  test.done();
};

exports['compact textforms format with exclaimation separated form code'] = test => {
  const doc = {
    sent_timestamp: '1-13-12 15:35',
    from: '+15551212',
    message: 'ANCR!sarah'
  };

  const expectedObj = {
    name: 'sarah'
  };

  const obj = smsparser.parse(def, doc);
  test.same(obj, expectedObj);
  test.done();
};

exports['compact textforms format with hyphen separated form code'] = test => {
  const doc = {
    sent_timestamp: '1-13-12 15:35',
    from: '+15551212',
    message: 'ANCR-sarah'
  };

  const expectedObj = {
    name: 'sarah'
  };

  const obj = smsparser.parse(def, doc);
  test.same(obj, expectedObj);
  test.done();
};

exports['compact textforms format uses quotes for multiple words'] = test => {
  const doc = {
    sent_timestamp: '1-13-12 15:35',
    from: '+15551212',
    message: 'ANCR "Sarah Connor" 24 2012-03-12'
  };

  const expectedObj = {
    name: 'Sarah Connor',
    lmp: 24,
    somedate: 1331510400000
  };

  const obj = smsparser.parse(def, doc);
  test.same(obj, expectedObj);
  test.done();
};

exports['compact textforms format handles quotes in quotes'] = test => {
  const doc = {
    sent_timestamp: '1-13-12 15:35',
    from: '+15551212',
    message: 'ANCR "Sarah "killer bee" Connor" 24 2012-03-12'
  };
  const expectedObj = {
    name: 'Sarah \"killer bee\" Connor',
    lmp: 24,
    somedate: 1331510400000
  };
  const obj = smsparser.parse(def, doc);
  test.same(obj, expectedObj);
  test.done();
};

exports['compact textforms handles too few fields'] = test => {
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
  test.same(obj, expectedObj);
  test.done();
};


exports['compact textforms handles too many fields'] = test => {
  const doc = {
    sent_timestamp: '1-13-12 15:35',
    from: '+15551212',
    message: 'ANCR "Sarah Connor" 24 2012-03-12 comment'
  };

  const expectedObj = {
    name: 'Sarah Connor',
    lmp: 24,
    somedate: 1331510400000
  };

  const obj = smsparser.parse(def, doc);
  test.same(obj, expectedObj);
  test.done();
};

exports['if last field is a string then quotes are optional'] = test => {
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
  test.same(obj, expectedObj);
  test.done();
};

exports['compact textforms handles mismatched types'] = test => {
  const doc = {
    sent_timestamp: '1-13-12 15:35',
    from: '+15551212',
    message: 'ANCR sarah abc 2012-03-12'
  };

  const expectedObj = {
    name: 'sarah',
    lmp: null,
    somedate: 1331510400000
  };

  const obj = smsparser.parse(def, doc);
  test.same(obj, expectedObj);
  test.done();
};

exports['compact textforms handles registrations starting with N'] = test => {
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
  test.same(obj, expectedObj);
  test.done();
};
