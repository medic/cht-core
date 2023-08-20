import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { assert, expect } from 'chai';
import sinon from 'sinon';
import { Subject } from 'rxjs';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';

import { MmModalAbstract, ModalService } from '@mm-modals/mm-modal/mm-modal';

describe('MmModalAbstract', () => {
  class mmModalChild extends MmModalAbstract {
    id = 'child';
  }
  let child;
  let bsModuleRef;

  beforeEach(() => {
    bsModuleRef = {
      hide: sinon.stub(),
      onHide: new Subject(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: BsModalRef, useValue: bsModuleRef },
      ],
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should be correctly initialized', () => {
    child = new mmModalChild(bsModuleRef);
    expect(child.status).to.deep.equal({
      processing: false,
      error: false,
      severity: false,
    });
    expect(child.modalClosePromise).to.be.an('object');
    expect(child.modalClosePromise).to.have.keys('promise', 'resolve', 'reject');
  });

  it('should setProcessing', () => {
    child = new mmModalChild(bsModuleRef);
    child.setProcessing();
    expect(child.status).to.deep.equal({
      processing: true,
      error: false,
      severity: false,
    });
  });

  it('should setFinished', () => {
    child = new mmModalChild(bsModuleRef);
    child.setFinished();
    expect(child.status).to.deep.equal({
      processing: false,
      error: false,
      severity: false,
    });
  });

  describe('setError', () => {
    it('should set error without message or severity', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      child = new mmModalChild(bsModuleRef);
      child.setError('error');
      expect(child.status).to.deep.equal({
        processing: false,
        error: undefined,
        severity: undefined,
      });
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
    });

    it('should set error without severity', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      child = new mmModalChild(bsModuleRef);
      child.setError('error', 'this is what happened');
      expect(child.status).to.deep.equal({
        processing: false,
        error: 'this is what happened',
        severity: undefined,
      });
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
    });

    it('should set error', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      child = new mmModalChild(bsModuleRef);
      child.setError('error', 'this is what happened', 'very severe');
      expect(child.status).to.deep.equal({
        processing: false,
        error: 'this is what happened',
        severity: 'very severe',
      });
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error submitting modal');
    });
  });

  describe('close / modalAccept', () => {
    it('should resolve the promise and hide the modal', fakeAsync(() => {
      child = new mmModalChild(bsModuleRef);
      expect(bsModuleRef.hide.callCount).to.equal(0);
      tick();
      expect(bsModuleRef.hide.callCount).to.equal(0);
      tick();
      expect(bsModuleRef.hide.callCount).to.equal(0);
      child.close();
      expect(bsModuleRef.hide.callCount).to.equal(1);
      return child.modalClosePromise.promise; // promise is resolved
    }));

    it('should resolve the promise and hide the modal with modalAccept', fakeAsync(() => {
      child = new mmModalChild(bsModuleRef);
      expect(bsModuleRef.hide.callCount).to.equal(0);
      tick();
      expect(bsModuleRef.hide.callCount).to.equal(0);
      tick();
      expect(bsModuleRef.hide.callCount).to.equal(0);
      child.modalAccept();
      expect(bsModuleRef.hide.callCount).to.equal(1);
      return child.modalClosePromise.promise; // promise is resolved
    }));
  });

  describe('cancel / modalReject', () => {
    it('should resolve the promise and hide the modal', fakeAsync(async () => {
      child = new mmModalChild(bsModuleRef);
      expect(bsModuleRef.hide.callCount).to.equal(0);
      tick();
      expect(bsModuleRef.hide.callCount).to.equal(0);
      tick();
      expect(bsModuleRef.hide.callCount).to.equal(0);
      child.cancel();
      expect(bsModuleRef.hide.callCount).to.equal(1);
      return child.modalClosePromise.promise
        .then(() => assert.fail('should have thrown'))
        .catch(err => {
          // we just promise.reject();
          expect(err).to.equal(undefined);
        });
    }));

    it('should resolve the promise and hide the modal with modalReject', fakeAsync(async () => {
      child = new mmModalChild(bsModuleRef);
      expect(bsModuleRef.hide.callCount).to.equal(0);
      tick();
      expect(bsModuleRef.hide.callCount).to.equal(0);
      tick();
      expect(bsModuleRef.hide.callCount).to.equal(0);
      child.modalReject();
      expect(bsModuleRef.hide.callCount).to.equal(1);
      return child.modalClosePromise.promise
        .then(() => assert.fail('should have thrown'))
        .catch(err => {
          // we just promise.reject();
          expect(err).to.equal(undefined);
        });
    }));
  });

  it('should reject on self-triggered hide', () => {
    child = new mmModalChild(bsModuleRef);
    bsModuleRef.onHide.next();
    return child.modalClosePromise.promise
      .then(() => assert.fail('should have thrown'))
      .catch(err => {
        // we just promise.reject();
        expect(err).to.equal(undefined);
      });
  });
});

describe('ModalService', () => {
  let bsModalService;
  let bsModuleRef;
  let service:ModalService;

  beforeEach(() => {
    bsModuleRef = {
      content: { modalClosePromise: { promise: 'the promise' } },
      onHidden: new Subject(),
    };
    bsModalService = { show: sinon.stub().returns(bsModuleRef) };

    TestBed.configureTestingModule({
      providers: [
        { provide: BsModalService, useValue: bsModalService },
      ],
    });
    service = TestBed.inject(ModalService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should open modal with no id', () => {
    const template = { an: 'object' };
    const result = service.show(template);
    expect(result).to.equal('the promise');
    expect(bsModalService.show.callCount).to.equal(1);
    expect(bsModalService.show.args[0]).to.deep.equal([
      template,
      { keyboard: true, show: true, animated: true }
    ]);

    service.show(template); // because no id, modal will be generated twice
    expect(bsModalService.show.callCount).to.equal(2);
    expect(bsModalService.show.args[1]).to.deep.equal([
      template,
      { keyboard: true, show: true, animated: true }
    ]);
  });

  it('passed args to bsModalService', () => {
    const template = { a: 'template' };
    const config = { config: 1 };
    service.show(template, config);

    expect(bsModalService.show.called).to.equal(true);
    const actual = bsModalService.show.args[0];
    expect(actual[0]).to.equal(template);
    expect(actual[1]).to.deep.equal({ keyboard: true, show: true, animated: true, config: 1 });
  });

  it('second identical modal does not open', () => {
    const template = { an: 'object', id: 'object' };
    bsModuleRef.content.modalClosePromise.promise = 'the new promise';

    // first call
    const result = service.show(template, { animated: false, additional: true });
    expect(result).to.equal('the new promise');
    expect(bsModalService.show.callCount).to.equal(1);
    expect(bsModalService.show.args[0]).to.deep.equal([
      template,
      { keyboard: true, show: true, animated: false, additional: true },
    ]);

    // second call
    const secondResult = service.show(template, { animated: false, additional: true });
    expect(secondResult).to.equal(result);
    expect(bsModalService.show.callCount).to.equal(1);
  });

  it('different modal does open', () => {
    const template1 = { template: 1 };
    const template2 = { template: 2 };

    const bsModuleRef1 = {
      content: { modalClosePromise: { promise: 'promise 1' } },
      onHidden: new Subject(),
    };
    const bsModuleRef2 = {
      content: { modalClosePromise: { promise: 'promise 2' } },
      onHidden: new Subject(),
    };
    bsModalService.show.onCall(0).returns(bsModuleRef1);
    bsModalService.show.onCall(1).returns(bsModuleRef2);

    // first call
    const result1 = service.show(template1, { config: 1 });
    expect(result1).to.equal('promise 1');
    expect(bsModalService.show.callCount).to.equal(1);
    expect(bsModalService.show.args[0]).to.deep.equal([
      template1,
      { keyboard: true, show: true, animated: true, config: 1 }
    ]);

    // second call
    const result2 = service.show(template2, { config: 2 });
    expect(result2).to.equal('promise 2');
    expect(bsModalService.show.callCount).to.equal(2);
    expect(bsModalService.show.args[1]).to.deep.equal([
      template2,
      { keyboard: true, show: true, animated: true, config: 2 }
    ]);
  });

  it('second identical modal opens if first modal is closed first', () => {
    const template1 = { an: 'object', id: 'object' };
    service.show(template1);
    const onHidden1 = bsModuleRef.onHidden;

    bsModuleRef.onHidden = new Subject();
    const template2 = { second: 'object' };
    // first call template 2
    service.show(template2);
    const onHidden2 = bsModuleRef.onHidden;

    expect(bsModalService.show.callCount).to.equal(2);
    // first call template 2
    service.show(template1);
    expect(bsModalService.show.callCount).to.equal(2); // reference for template1 modal is saved

    onHidden1.next(); // hide template1 modal
    // second call template 1
    service.show(template1);
    expect(bsModalService.show.callCount).to.equal(3); // reference was removed when modal has hidden
    expect(bsModalService.show.args[2]).to.deep.equal([template1, { keyboard: true, show: true, animated: true } ]);

    onHidden2.next(); // hide template2 modal
  });

  it('should nullcheck the modalref properties', async () => {
    delete bsModuleRef.content;
    const template1 = { an: 'object', id: 'object' };
    const result = await service.show(template1);
    expect(result).to.equal(undefined);
  });
});
