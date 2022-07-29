const chai = require('chai');
const { expect } = chai;

const sinon = require('sinon');
const rewire = require('rewire');

const uploadDefaultDocs = rewire('../../src/upload-default-docs');

describe('upload default docs', () => {
  let mocks;
  const exampleDoc = { x: true };
  beforeEach(() => {
    mocks = {
      settingService: {
        get: sinon.stub().rejects(),
        update: sinon.stub().resolves(),
      },
      db: {
        medic: {
          bulkDocs: sinon.stub().resolves([]),
        },
      },
      fs: {
        readdirSync: sinon.stub().returns([]),
        existsSync: sinon.stub().returns(true),
        readFileSync: sinon.stub().returns(JSON.stringify(exampleDoc)),
      }
    };

    for (const key of Object.keys(mocks)) {
      uploadDefaultDocs.__set__(key, mocks[key]);
    }
  });

  it('noop if settings exist', async () => {
    mocks.settingService.get.resolves({ settings: {} });
    await uploadDefaultDocs.run();
    expect(mocks.db.medic.bulkDocs.callCount).to.eq(0);
    expect(mocks.settingService.update.callCount).to.eq(0);
  });

  it('noop if default-docs dir doesnt exist', async () => {
    mocks.fs.existsSync.returns(false);
    await uploadDefaultDocs.run();
    expect(mocks.fs.readdirSync.callCount).to.eq(0);
  });

  it('settings doc is uploaded via settings service', async () => {
    mocks.fs.readdirSync.returns(['settings.doc.json']);
    await uploadDefaultDocs.run();
    expect(mocks.fs.readFileSync.callCount).to.eq(1);
    expect(mocks.settingService.update.callCount).to.eq(1);
    expect(mocks.settingService.update.args[0]).to.deep.eq([exampleDoc]);
  });

  it('successful bulk upload', async () => {
    mocks.fs.readdirSync.returns(['messages-en.properties']);
    await uploadDefaultDocs.run();
    expect(mocks.fs.readFileSync.callCount).to.eq(1);
    expect(mocks.settingService.update.callCount).to.eq(0);
    expect(mocks.db.medic.bulkDocs.callCount).to.eq(1);
    expect(mocks.db.medic.bulkDocs.args[0]).to.deep.eq([[exampleDoc]]);
  });

  it('throws on document conflict', () => {
    mocks.fs.readdirSync.returns(['messages-en.properties', 'messages-fr.properties']);
    mocks.db.medic.bulkDocs
      .resolves([{ ok: true }, { error: 'conflict', id: 'messages-fr.properties', message: 'Document conflict.' }]);
    return uploadDefaultDocs.run()
      .then(() => expect.fail('should have thrown'))
      .catch(() => {
        expect(mocks.fs.readFileSync.callCount).to.eq(2);
        expect(mocks.settingService.update.callCount).to.eq(0);
        expect(mocks.db.medic.bulkDocs.callCount).to.eq(1);
        expect(mocks.db.medic.bulkDocs.args[0]).to.deep.eq([[exampleDoc, exampleDoc]]);
      });
  });
});

