import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Subject } from 'rxjs';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';

import { P2pComponent } from '@mm-modules/p2p/p2p.component';
import { P2pResult, P2pService } from '@mm-services/p2p.service';

/**
 * The real toolbar reaches the session, the database and PouchDB, none of which this component
 * touches. Standing in for it keeps the test about pairing.
 */
@Component({ selector: 'mm-tool-bar', template: '', standalone: true })
class StubToolBarComponent { }

describe('P2p component', () => {
  let component: P2pComponent;
  let fixture: ComponentFixture<P2pComponent>;
  let p2pService;
  let hostingResult: Subject<P2pResult>;
  let pairingResult: Subject<P2pResult>;

  const create = async (overrides:any = {}) => {
    Object.assign(p2pService, overrides);
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        BrowserAnimationsModule,
        P2pComponent,
      ],
      providers: [{ provide: P2pService, useValue: p2pService }],
    });
    TestBed.overrideComponent(P2pComponent, {
      remove: { imports: [ToolBarComponent] },
      add: { imports: [StubToolBarComponent] },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(P2pComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
  };

  beforeEach(() => {
    hostingResult = new Subject<P2pResult>();
    pairingResult = new Subject<P2pResult>();
    p2pService = {
      isSupported: sinon.stub().returns(true),
      canHost: sinon.stub().resolves(true),
      canJoin: sinon.stub().resolves(true),
      hostingResult: () => hostingResult.asObservable(),
      pairingResult: () => pairingResult.asObservable(),
      startHosting: sinon.stub(),
      stopHosting: sinon.stub(),
      scanAndJoin: sinon.stub(),
      leaveSession: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('what the user is offered', () => {
    it('offers nothing outside the android app', async () => {
      await create({
        isSupported: sinon.stub().returns(false),
        canHost: sinon.stub().resolves(false),
        canJoin: sinon.stub().resolves(false),
      });

      expect(component.supported).to.be.false;
      expect(component.canHost).to.be.false;
    });

    /** A device can be able to send but not receive, so the two are asked separately. */
    it('offers only joining on a device that cannot host', async () => {
      await create({ canHost: sinon.stub().resolves(false) });

      expect(component.canHost).to.be.false;
      expect(component.canJoin).to.be.true;
    });

    it('stops showing the loading card once it knows', async () => {
      await create();

      expect(component.loading).to.be.false;
    });
  });

  describe('hosting', () => {
    it('shows the code once the session is ready', async () => {
      await create();

      component.startHosting();
      expect(component.state).to.equal('starting');

      hostingResult.next({ ok: true, detail: 'data:image/png;base64,abc' });

      expect(component.state).to.equal('hosting');
      expect(component.qrImage).to.equal('data:image/png;base64,abc');
    });

    it('turns a failure code into a translation key, never raw text', async () => {
      await create();

      component.startHosting();
      hostingResult.next({ ok: false, detail: 'hotspot_unsupported' });

      expect(component.state).to.equal('failed');
      expect(component.errorKey).to.equal('p2p.error.hotspot_unsupported');
      expect(component.qrImage).to.be.null;
    });

    it('falls back to a real message for a code it does not know', async () => {
      await create();

      hostingResult.next({ ok: false, detail: '' });

      expect(component.errorKey).to.equal('p2p.error.unknown');
    });

    it('clears the code when hosting stops', async () => {
      await create();
      component.startHosting();
      hostingResult.next({ ok: true, detail: 'data:image/png;base64,abc' });

      component.stopHosting();

      expect(p2pService.stopHosting.callCount).to.equal(1);
      expect(component.state).to.equal('idle');
      expect(component.qrImage).to.be.null;
    });
  });

  describe('joining', () => {
    it('names the host it connected to, so the user can check it', async () => {
      await create();

      component.scanAndJoin();
      expect(component.state).to.equal('joining');

      pairingResult.next({ ok: true, detail: 'Supervisor phone' });

      expect(component.state).to.equal('paired');
      expect(component.hostLabel).to.equal('Supervisor phone');
    });

    /** The security-critical one: the user must be told, not quietly left connected. */
    it('reports a host that could not be verified', async () => {
      await create();

      component.scanAndJoin();
      pairingResult.next({ ok: false, detail: 'host_not_verified' });

      expect(component.state).to.equal('failed');
      expect(component.errorKey).to.equal('p2p.error.host_not_verified');
      expect(component.hostLabel).to.be.null;
    });

    it('clears the session when the user disconnects', async () => {
      await create();
      component.scanAndJoin();
      pairingResult.next({ ok: true, detail: 'Supervisor phone' });

      component.leaveSession();

      expect(p2pService.leaveSession.callCount).to.equal(1);
      expect(component.state).to.equal('idle');
      expect(component.hostLabel).to.be.null;
    });
  });

  it('stops listening when it goes away', async () => {
    await create();

    component.ngOnDestroy();
    hostingResult.next({ ok: true, detail: 'ignored' });

    expect(component.state).to.equal('idle');
  });
});
