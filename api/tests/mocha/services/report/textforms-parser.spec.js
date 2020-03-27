const chai = require('chai');
const textformsParser = require('../../../../src/services/report/textforms-parser');

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

describe('textforms parser', () => {

  it('is compact true', () => {
    const doc = {
      message: 'sarah 24 2012-03-12'
    };

    chai.expect(textformsParser.isCompact(def, doc)).to.equal(true);
  });

  it('is compact true when field value starts with field name', () => {
    const doc = {
      message: 'Norah 24 2012-03-12'
    };

    chai.expect(textformsParser.isCompact(def, doc)).to.equal(true);
  });

  it('is compact false', () => {
    const doc = {
      message: 'n sarah lmp 24 d 2012-03-12'
    };

    chai.expect(textformsParser.isCompact(def, doc)).to.equal(false);
  });

  it('is compact false and respects locale property', () => {
    const doc = {
      message: 'j sarah lmp 24 d 2012-03-12',
      locale: 'sw'
    };

    chai.expect(textformsParser.isCompact(def, doc, doc.locale)).to.equal(false);
  });

  it('is compact false when field value starts with number', () => {
    const doc = {
      message: 'LMP24'
    };

    chai.expect(textformsParser.isCompact(def, doc)).to.equal(false);
  });

  it('is compact false when field value absent', () => {
    const doc = {
      message: 'lmp'
    };

    chai.expect(textformsParser.isCompact(def, doc)).to.equal(false);
  });

  it('is compact respects locale', () => {
    const doc = {
      message: 'lmp',
      locale: 'sw'
    };

    chai.expect(textformsParser.isCompact(def, doc.message, doc.locale)).to.equal(false);
  });

});
