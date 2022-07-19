const chai = require('chai');
const sinon = require('sinon');
const service = require('../../../src/services/privacy-policy');
const db = require('../../../src/db');
const config = require('../../../src/config');

describe('Privacy Policy service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('exists', () => {

    it('returns false when doc does not exist', () => {
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      return service.exists().then(response => {
        chai.expect(response).to.equal(false);
      });
    });

    it('returns false when privacy_policy property undefined', () => {
      sinon.stub(db.medic, 'get').resolves({ });
      return service.exists().then(response => {
        chai.expect(response).to.equal(false);
      });
    });

    it('returns false when privacy_policy object empty', () => {
      sinon.stub(db.medic, 'get').resolves({ privacy_policies: {} });
      return service.exists().then(response => {
        chai.expect(response).to.equal(false);
      });
    });

    it('returns true when policy exists', () => {
      sinon.stub(db.medic, 'get').resolves({ privacy_policies: { 'en': 'en.html' } });
      return service.exists().then(response => {
        chai.expect(response).to.equal(true);
        chai.expect(db.medic.get.callCount).to.equal(1);
      });
    });

  });

  describe('get', () => {

    const doc = {
      privacy_policies: {
        'en': 'en.html',
        'fr': 'french.html',
        'ne': 'html.html'
      },
      _attachments: {
        'en.html': {
          data: Buffer.from('englishpp').toString('base64')
        },
        'french.html': {
          data: Buffer.from('frenchpp').toString('base64')
        },
        'html.html': {
          data: Buffer.from('test<script>alert("hax")</script>').toString('base64')
        }
      }
    };

    it('returns attachment for locale if exists', () => {
      sinon.stub(db.medic, 'get').resolves(doc);
      return service.get('fr').then(response => {
        chai.expect(response).to.equal('frenchpp');
      });
    });

    it('returns attachment for first locale if requested not found', () => {
      sinon.stub(db.medic, 'get').resolves(doc);
      return service.get('sw').then(response => {
        chai.expect(response).to.equal('englishpp');
      });
    });

    it('sanitizes html fragment', () => {
      sinon.stub(db.medic, 'get').resolves(doc);
      return service.get('ne').then(response => {
        chai.expect(response).to.equal('test');
      });
    });

    it('defaults to configured default locale', () => {
      sinon.stub(config, 'get').returns('ne');
      sinon.stub(db.medic, 'get').resolves(doc);
      return service.get().then(response => {
        chai.expect(response).to.equal('test');
      });
    });

    it('defaults to en if requested locale not configured', () => {
      sinon.stub(db.medic, 'get').resolves(doc);
      return service.get('sw').then(response => {
        chai.expect(response).to.equal('englishpp');
      });
    });

    it('defaults to first policy if requested locale and en not configured', () => {

      const noEnglish = {
        privacy_policies: {
          'fr': 'french.html',
          'ne': 'html.html'
        },
        _attachments: {
          'french.html': {
            data: Buffer.from('frenchpp').toString('base64')
          },
          'html.html': {
            data: Buffer.from('test<script>alert("hax")</script>').toString('base64')
          }
        }
      };

      sinon.stub(db.medic, 'get').resolves(noEnglish);
      return service.get('sw').then(response => {
        chai.expect(response).to.equal('frenchpp');
      });
    });

  });

});
