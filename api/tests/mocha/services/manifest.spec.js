const chai = require('chai');
const sinon = require('sinon');

const fs = require('fs');
const path = require('path');

const brandingService = require('../../../src/services/branding');

const service = require('../../../src/services/manifest');
const baseDir = path.join(__dirname, '..', '..', '..');

describe('manifest service', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('gracefully generates manifest from default branding doc', async () => {

    const branding = {
      name: 'CHT',
      icon: 'logo.png',
      doc: {}
    };

    const get = sinon.stub(brandingService, 'get').resolves(branding);
    const writeFile = sinon.stub(fs, 'writeFile').callsArgWith(2, null, null);

    await service.generate();
    chai.expect(get.callCount).to.equal(1);
    chai.expect(writeFile.callCount).to.equal(1);
    chai.expect(writeFile.args[0][0]).to.equal(baseDir + '/build/static/webapp/manifest.json');
    const manifest = JSON.parse(writeFile.args[0][1]);
    chai.expect(manifest.name).to.equal('CHT');
    chai.expect(manifest.icons[0].src).to.equal('/img/logo.png');
  });

  it('uses configured branding doc and extracts logo', async () => {

    const branding = {
      name: 'CHT',
      icon: 'logo.png',
      doc: {
        resources: {
          icon: 'logo.png',
        },
        _attachments: {
          'logo.png': {
            data: 'xyz'
          }
        }
      }
    };

    const get = sinon.stub(brandingService, 'get').resolves(branding);
    const writeFile = sinon.stub(fs, 'writeFile').callsArgWith(2, null, null);

    sinon.stub(Buffer, 'from').returns('base64xyz');

    await service.generate();
    chai.expect(get.callCount).to.equal(1);
    chai.expect(writeFile.callCount).to.equal(2);
    chai.expect(writeFile.args[0][0]).to.equal(baseDir + '/build/static/webapp/manifest.json');
    const manifest = JSON.parse(writeFile.args[0][1]);
    chai.expect(manifest.name).to.equal('CHT');
    chai.expect(manifest.icons[0].src).to.equal('/img/logo.png');
    chai.expect(writeFile.args[1][0]).to.equal(baseDir + '/build/static/webapp/img/logo.png');
    chai.expect(writeFile.args[1][1]).to.equal('base64xyz');
  });

  it('generates valid JSON when branding name contains special characters', async () => {

    const branding = {
      name: 'CHT "Community" Health\\Tool',
      icon: 'icon.png',
      doc: {}
    };

    sinon.stub(brandingService, 'get').resolves(branding);
    const writeFile = sinon.stub(fs, 'writeFile').callsArgWith(2, null, null);

    await service.generate();
    const manifest = JSON.parse(writeFile.args[0][1]);
    chai.expect(manifest.name).to.equal('CHT "Community" Health\\Tool');
  });

});
