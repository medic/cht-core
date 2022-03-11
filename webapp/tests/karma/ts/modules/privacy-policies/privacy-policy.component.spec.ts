import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { PrivacyPolicyComponent } from '@mm-modules/privacy-policy/privacy-policy.component';
import { PrivacyPoliciesService } from '@mm-services/privacy-policies.service';
import { GlobalActions } from '@mm-actions/global';
import { StartupModalsService } from '@mm-services/startup-modals.service';

describe('PrivacyPoliciesComponent', () => {
  let component: PrivacyPolicyComponent;
  let fixture: ComponentFixture<PrivacyPolicyComponent>;
  let privacyPoliciesService;
  let startupModalsService;

  beforeEach(waitForAsync(() => {
    privacyPoliciesService = {
      accept: sinon.stub().resolves({}),
      hasAccepted: sinon.stub(),
      getPrivacyPolicy: sinon.stub().resolves(),
      decodeUnicode: sinon.stub(),
    };

    startupModalsService = {
      showStartupModals: sinon.stub().resolves()
    };

    return TestBed
      .configureTestingModule({
        declarations: [ PrivacyPolicyComponent ],
        providers: [
          provideMockStore(),
          { provide: PrivacyPoliciesService, useValue: privacyPoliciesService },
          { provide: StartupModalsService, useValue: startupModalsService }
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(PrivacyPolicyComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create PrivacyPoliciesComponent', () => {
    expect(component).to.exist;
  });

  it('should load when no privacy policy', async () => {
    sinon.reset();
    privacyPoliciesService.getPrivacyPolicy.resolves(false);
    const setShowPrivacyPolicySpy = sinon.spy(GlobalActions.prototype, 'setShowPrivacyPolicy');
    const setPrivacyPolicyAcceptedSpy = sinon.spy(GlobalActions.prototype, 'setPrivacyPolicyAccepted');

    await component.getPrivatePolicy();

    expect(privacyPoliciesService.getPrivacyPolicy.callCount).to.equal(1);
    expect(component.privacyPolicy).to.equal(undefined);
    expect(component.loading).to.equal(false);
    expect(setShowPrivacyPolicySpy.callCount).to.equal(1);
    expect(setShowPrivacyPolicySpy.args[0][0]).to.equal(false);
    expect(setPrivacyPolicyAcceptedSpy.callCount).to.equal(1);
    expect(setPrivacyPolicyAcceptedSpy.args[0][0]).to.equal(true);
  });

  it('should load when privacy policy exists', async () => {
    sinon.reset();
    privacyPoliciesService.getPrivacyPolicy.resolves({
      html: 'html',
      digest: 'digest',
      language: 'en',
    });
    const setShowPrivacyPolicySpy = sinon.spy(GlobalActions.prototype, 'setShowPrivacyPolicy');
    const setPrivacyPolicyAcceptedSpy = sinon.spy(GlobalActions.prototype, 'setPrivacyPolicyAccepted');

    await component.getPrivatePolicy();

    expect(privacyPoliciesService.getPrivacyPolicy.callCount).to.equal(1);
    expect(component.privacyPolicy).to.deep.equal({
      html: 'html',
      digest: 'digest',
      language: 'en',
    });
    expect(component.loading).to.equal(false);
    expect(setShowPrivacyPolicySpy.callCount).to.equal(0);
    expect(setPrivacyPolicyAcceptedSpy.callCount).to.equal(0);
    expect(startupModalsService.showStartupModals.callCount).to.equal(0);
  });

  it('should accept privacy policy', async () => {
    const policy = {
      html: 'html',
      digest: 'my_digest',
      language: 'fr',
    };
    component.privacyPolicy = { ...policy };
    const setPrivacyPolicyAcceptedSpy = sinon.spy(GlobalActions.prototype, 'setPrivacyPolicyAccepted');

    await component.accept();

    expect(component.accepting).to.equal(true);
    expect(privacyPoliciesService.accept.callCount).to.equal(1);
    expect(privacyPoliciesService.accept.args[0][0]).to.deep.equal(policy);
    expect(setPrivacyPolicyAcceptedSpy.callCount).to.equal(1);
    expect(setPrivacyPolicyAcceptedSpy.args[0][0]).to.equal(true);
    expect(startupModalsService.showStartupModals.callCount).to.equal(1);
  });

  it('should fail gracefully when accepting privacy policy fails', async () => {
    const policy = {
      html: 'html',
      digest: 'my_digest',
      language: 'fr',
    };
    component.privacyPolicy = { ...policy };
    privacyPoliciesService.accept.rejects(new Error('error'));
    const setPrivacyPolicyAcceptedSpy = sinon.spy(GlobalActions.prototype, 'setPrivacyPolicyAccepted');

    await component.accept();

    expect(component.accepting).to.equal(true);
    expect(privacyPoliciesService.accept.callCount).to.equal(1);
    expect(privacyPoliciesService.accept.args[0][0]).to.deep.equal(policy);
    expect(setPrivacyPolicyAcceptedSpy.callCount).to.equal(1);
    expect(setPrivacyPolicyAcceptedSpy.args[0][0]).to.equal(true);
    expect(startupModalsService.showStartupModals.callCount).to.equal(1);
  });

});
