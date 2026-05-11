import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { expect } from 'chai';
import sinon from 'sinon';

import { UiExtensionsTabRouteGuardProvider } from '@mm-modules/ui-extensions/ui-extensions-route.guard.provider';
import { UiExtensionsService } from '@mm-services/ui-extensions.service';

describe('UiExtensionsTabRouteGuardProvider', () => {
  let guard: UiExtensionsTabRouteGuardProvider;
  let uiExtensionsService;

  const getRoute = (id: string) => ({ params: { id } }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    uiExtensionsService = { getProperties: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        UiExtensionsTabRouteGuardProvider,
        { provide: UiExtensionsService, useValue: uiExtensionsService },
      ]
    });

    guard = TestBed.inject(UiExtensionsTabRouteGuardProvider);
  });

  afterEach(() => sinon.restore());

  it('should activate for header_tab type', async () => {
    uiExtensionsService.getProperties.resolves({ id: 'ext-1', type: 'header_tab' });
    const result = await guard.canActivate(getRoute('ext-1'));
    expect(result).to.be.true;
    expect(uiExtensionsService.getProperties).to.have.been.calledOnceWithExactly('ext-1');
  });

  it('should activate for sidebar_tab type', async () => {
    uiExtensionsService.getProperties.resolves({ id: 'ext-2', type: 'sidebar_tab' });
    const result = await guard.canActivate(getRoute('ext-2'));
    expect(result).to.be.true;
    expect(uiExtensionsService.getProperties).to.have.been.calledOnceWithExactly('ext-2');
  });

  it('should not activate for unknown type', async () => {
    uiExtensionsService.getProperties.resolves({ id: 'ext-3', type: 'other_type' });
    const result = await guard.canActivate(getRoute('ext-3'));
    expect(result).to.be.false;
    expect(uiExtensionsService.getProperties).to.have.been.calledOnceWithExactly('ext-3');
  });

  it('should not activate when extension properties not found', async () => {
    uiExtensionsService.getProperties.rejects(new Error('not found'));
    const result = await guard.canActivate(getRoute('missing-ext'));
    expect(result).to.be.false;
    expect(uiExtensionsService.getProperties).to.have.been.calledOnceWithExactly('missing-ext');
  });
});
