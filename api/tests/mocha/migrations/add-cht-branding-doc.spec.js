const sinon = require('sinon');
const chai = require('chai');

const fs = require('fs');

const db = require('../../../src/db');
const migration = require('../../../src/migrations/add-cht-branding-doc');

describe('add-cht-branding-doc', () => {

  it('should have correct name and date', () => {
    chai.expect(migration.name).to.equal('add-cht-branding-doc');
    chai.expect(migration.created).to.deep.equal(new Date(2023, 11, 22, 10, 0, 0, 0));
  });

  it('should save default doc when no branding doc found', async () => {
    sinon.stub(db.medic, 'get').throws('not found');
    sinon.stub(db.medic, 'put').resolves();
    sinon.stub(fs, 'readFile').callsArgWith(1, null, 'imagedata');
    await migration.run();
    chai.expect(db.medic.put.callCount).to.equal(1);
    const expected = {
      _id: 'branding',
      resources: {
        favicon: 'favicon.ico',
        logo: 'cht-logo.png'
      },
      title: 'Community Health Toolkit',
      _attachments: {
        'cht-logo.png': {
          content_type: 'image/png',
          data: Buffer.from('imagedata', 'base64')
        },
        'favicon.ico': {
          content_type: 'image/x-icon',
          data: Buffer.from('imagedata', 'base64')
        }
      },
    };
    chai.expect(db.medic.put.args[0][0]).to.deep.equal(expected);
  });

  it('should not update doc when updated branding doc found', async () => {
    sinon.stub(db.medic, 'get').resolves({
      _id: 'branding',
      _rev: '123',
      resources: {
        favicon: 'favicon.ico',
        logo: 'cht-logo.png'
      },
      title: 'My awesome app',
      _attachments: {
        'cht-logo.png': {
          digest: 'md5-diff=='
        },
        'favicon.ico': {
          digest: 'md5-diff=='
        }
      },    
    });
    sinon.stub(db.medic, 'put');
    await migration.run();
    chai.expect(db.medic.put.callCount).to.equal(0);
  });

});
