const textformsParser = require('../../../../services/report/textforms-parser');

const def = {
  meta: {
    code: 'ANCR'
  },
  fields: {
    name: {
      labels: {
        short: 'Name',
        tiny: {
          en: 'N',
          sw: 'J'
        }
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

exports['is compact true'] = test => {
  const doc = {
    message: 'sarah 24 2012-03-12'
  };

  test.ok(textformsParser.isCompact(def, doc));
  test.done();
};

exports['is compact true when field value starts with field name'] = test => {
  const doc = {
    message: 'Norah 24 2012-03-12'
  };

  test.ok(textformsParser.isCompact(def, doc));
  test.done();
};

exports['is compact false'] = test => {
  const doc = {
    message: 'n sarah lmp 24 d 2012-03-12'
  };

  test.ok(!textformsParser.isCompact(def, doc));
  test.done();
};

exports['is compact false and respects locale property'] = test => {
  const doc = {
    message: 'j sarah lmp 24 d 2012-03-12',
    locale: 'sw'
  };

  test.ok(!textformsParser.isCompact(def, doc, doc.locale));
  test.done();
};

exports['is compact false when field value starts with number'] = test => {
  const doc = {
    message: 'LMP24'
  };

  test.ok(!textformsParser.isCompact(def, doc));
  test.done();
};

exports['is compact false when field value absent'] = test => {
  const doc = {
    message: 'lmp'
  };

  test.ok(!textformsParser.isCompact(def, doc));
  test.done();
};

exports['is compact respects locale'] = test => {
  const doc = {
    message: 'lmp',
    locale: 'sw'
  };

  test.ok(!textformsParser.isCompact(def, doc.message, doc.locale));
  test.done();
};
