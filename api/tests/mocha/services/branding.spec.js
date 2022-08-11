const chai = require('chai');
const sinon = require('sinon');

const fs = require('fs');
const path = require('path');

const db = require('../../../src/db').medic;

const service = require('../../../src/services/branding');
const baseDir = path.join(__dirname, '..', '..', '..', 'src');

describe('branding service', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('returns default when missing doc', async () => {
    const get = sinon.stub(db, 'get').rejects({});
    const readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'zyx');
    const result = await service.get();
    chai.expect(get.callCount).to.equal(1);
    chai.expect(get.args[0][0]).to.equal('branding');
    chai.expect(get.args[0][1].attachments).to.equal(true);
    chai.expect(readFile.callCount).to.equal(1);
    chai.expect(readFile.args[0][0]).to.equal(baseDir + '/resources/logo/medic-logo-light-full.svg');
    chai.expect(result.name).to.equal('CHT');
    chai.expect(result.logo).to.equal('data:image/svg+xml;base64,enl4');
    chai.expect(result.icon).to.equal('icon.png');
  });

  it('returns configured branding', async () => {
    const doc = {
      title: 'some name',
      resources: {
        logo: 'somelogo.png',
        icon: 'leastfavicon.ico'
      },
      _attachments: {
        'somelogo.png': {
          data: 'base64data',
          content_type: 'image/png'
        }
      }
    };
    const get = sinon.stub(db, 'get').resolves(doc);
    const readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'zyx');
    const result = await service.get();
    chai.expect(get.callCount).to.equal(1);
    chai.expect(readFile.callCount).to.equal(0);
    chai.expect(result.name).to.equal('some name');
    chai.expect(result.logo).to.equal('data:image/png;base64,base64data');
    chai.expect(result.icon).to.equal('leastfavicon.ico');
    chai.expect(result.doc).to.equal(doc);
  });

});
