import sinon from 'sinon';
import { SinonStub } from 'sinon';
import { expect } from 'chai';
import { TestBed } from '@angular/core/testing';
import { CHTDatasourceService } from '../../../src/stubs/cht-datasource.service';

describe('CHT Datasource Service', () => {
  let service: CHTDatasourceService;
  let consoleError: SinonStub;

  beforeEach(() => {
    consoleError = sinon.stub(console, 'error');
    service = TestBed.inject(CHTDatasourceService);
  });

  afterEach(() => sinon.restore());

  it('getSync', () => {
    const chtApi = service.getSync();

    expect(chtApi).to.have.keys(['v1']);
    expect(chtApi.v1).to.have.keys(['getExtensionLib']);
    expect(chtApi.v1).to.have.property('getExtensionLib');
    expect(chtApi.v1.getExtensionLib).to.be.a('function');
  });

  it('bind', async () => {
    const result = await service.bind(sinon.stub())();
    expect(result).to.be.undefined;
  });

  describe('addExtensionLib', () => {
    it('adds new function to extension library', () => {
      const extensionFn = `module.exports = () => 'hello world'`;
      const fnName = 'testLib';

      service.addExtensionLib(fnName, extensionFn);

      const testLib= service.getSync().v1.getExtensionLib(fnName);
      const result = testLib();

      expect(result).to.equal('hello world');
      expect(consoleError.notCalled).to.be.true;
    });

    it('throws error if function cannot be deserialized', () => {
      const extensionFn = `hello world`;
      const fnName = 'testLib';

      try {
        service.addExtensionLib(fnName, extensionFn);
        expect.fail('Error should have been thrown');
      } catch (e) {
        expect(e.message).to.include('Unexpected identifier \'world\'');
        expect(consoleError.calledOnceWithExactly(`Error loading extension lib: "["${fnName}"`, e)).to.be.true;
      }
    });
  });
});
