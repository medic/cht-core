import { expect } from 'chai';

import * as medicXpathExtensions from '../../../../src/js/enketo/medic-xpath-extensions.js';

describe('Medic XPath Extensions', () => {
  it('should have expected attributes', () => {
    expect(medicXpathExtensions).to.not.be.undefined;
    expect(medicXpathExtensions.getTimezoneOffsetAsTime).to.be.a('function');
    expect(medicXpathExtensions.toISOLocalString).to.be.a('function');
    expect(medicXpathExtensions.init).to.be.a('function');

    expect(medicXpathExtensions.func).to.not.be.undefined;
    expect(medicXpathExtensions.func['z-score']).to.be.a('function');
    expect(medicXpathExtensions.func['parse-timestamp-to-date']).to.be.a('function');

    expect(medicXpathExtensions.process).to.not.be.undefined;
    expect(medicXpathExtensions.process.toExternalResult).to.be.a('function');
  });

  describe('parse-timestamp-to-date()', () => {
    let parseTimestampToDate;

    beforeEach(() => {
      parseTimestampToDate = medicXpathExtensions.func['parse-timestamp-to-date'];
    });

    it('should return empty if the parameter or parameter\'s value is undefined', () => {
      expect(parseTimestampToDate()).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ t: 'str' })).to.deep.equal({ t:'str', v: '' });
    });

    it('should return empty if value isnt timestamp', () => {
      expect(parseTimestampToDate({ t: 'arr', v: [true] })).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ t: 'arr', v: [undefined] })).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ t: 'arr', v: [null] })).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ t: 'arr', v: ['some text'] })).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ t: 'arr', v: [NaN] })).to.deep.equal({ t:'str', v: '' });

      expect(parseTimestampToDate({ v: true })).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ v: undefined })).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ v: null })).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ v: 'some text' })).to.deep.equal({ t:'str', v: '' });
      expect(parseTimestampToDate({ v: NaN })).to.deep.equal({ t:'str', v: '' });
    });

    it('should return date', () => {
      const timestamp = new Date('2021/05/23 10:20:40 GMT').getTime();
      const resultArrayDate = parseTimestampToDate({ t: 'arr', v: [timestamp] });
      const resultDate = parseTimestampToDate({ t: 'arr', v: timestamp });

      expect(resultArrayDate.t).to.equal('date');
      expect(resultArrayDate.v.toUTCString()).to.equal('Sun, 23 May 2021 10:20:40 GMT');

      expect(resultDate.t).to.equal('date');
      expect(resultDate.v.toUTCString()).to.equal('Sun, 23 May 2021 10:20:40 GMT');
    });
  });
});
