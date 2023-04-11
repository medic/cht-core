const chai = require('chai');
const sinon = require('sinon');

const fs = require('fs');
const path = require('path');

const brandingService = require('../../../src/services/branding');

const service = require('../../../src/services/manifest');
const baseDir = path.join(__dirname, '..', '..', '..');

const JSON_TEMPLATE = JSON.stringify({
  name: '{{ branding.name }}',
  icon: '{{ branding.icon }}'
});

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
    const readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, JSON_TEMPLATE);
    const writeFile = sinon.stub(fs, 'writeFile').callsArgWith(2, null, null);

    await service.generate();
    chai.expect(get.callCount).to.equal(1);
    chai.expect(readFile.callCount).to.equal(1);
    chai.expect(readFile.args[0][0]).to.equal(baseDir + '/src/templates/manifest.json');
    chai.expect(writeFile.callCount).to.equal(1);
    chai.expect(writeFile.args[0][0]).to.equal(baseDir + '/build/static/webapp/manifest.json');
    chai.expect(writeFile.args[0][1]).to.equal('{"name":"CHT","icon":"logo.png"}');
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
    const readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, JSON_TEMPLATE);
    const writeFile = sinon.stub(fs, 'writeFile').callsArgWith(2, null, null);

    sinon.stub(Buffer, 'from').returns('base64xyz');

    await service.generate();
    chai.expect(get.callCount).to.equal(1);
    chai.expect(readFile.callCount).to.equal(1);
    chai.expect(readFile.args[0][0]).to.equal(baseDir + '/src/templates/manifest.json');
    chai.expect(writeFile.callCount).to.equal(2);
    chai.expect(writeFile.args[0][0]).to.equal(baseDir + '/build/static/webapp/manifest.json');
    chai.expect(writeFile.args[0][1]).to.equal('{"name":"CHT","icon":"logo.png"}');
    chai.expect(writeFile.args[1][0]).to.equal(baseDir + '/build/static/webapp/img/logo.png');
    chai.expect(writeFile.args[1][1]).to.equal('base64xyz');
  });

});
