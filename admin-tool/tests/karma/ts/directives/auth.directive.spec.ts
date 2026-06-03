import { Component } from '@angular/core';
import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AuthDirective } from '@admin-tool-directives/auth.directive';
import { AuthService } from '@admin-tool-services/auth.service';

@Component({
  standalone: true,
  imports: [AuthDirective],
  template: `<div [mmAuth]="mmAuth" [mmAuthOnline]="mmAuthOnline" [mmAuthAny]="mmAuthAny"></div>`
})
class TestHostComponent {
  mmAuth?: string;
  mmAuthOnline?: boolean;
  mmAuthAny?: any;
}

describe('AuthDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let authService;

  const getElement = () => fixture.nativeElement.querySelector('div');

  beforeEach(() => {
    authService = {
      has: sinon.stub(),
      any: sinon.stub(),
      online: sinon.stub(),
    };

    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: AuthService, useValue: authService },
      ]
    });

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('mmAuth', () => {
    it('should hide element when user lacks permission', fakeAsync(() => {
      authService.has.resolves(false);
      component.mmAuth = 'can_configure';

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.true;
    }));

    it('should show element when user has permission', fakeAsync(() => {
      authService.has.resolves(true);
      component.mmAuth = 'can_configure';

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.false;
    }));

    it('should pass comma-split permissions to has()', fakeAsync(() => {
      authService.has.resolves(true);
      component.mmAuth = 'can_configure,can_upgrade';

      fixture.detectChanges();
      tick();

      expect(authService.has.calledWith(['can_configure', 'can_upgrade'])).to.be.true;
    }));
  });

  describe('mmAuthOnline', () => {
    it('should show element when online check passes', fakeAsync(() => {
      authService.online.returns(true);
      component.mmAuthOnline = true;

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.false;
    }));

    it('should hide element when online check fails', fakeAsync(() => {
      authService.online.returns(false);
      component.mmAuthOnline = true;

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.true;
    }));
  });

  describe('mmAuthAny', () => {
    it('should show element when mmAuthAny contains true', fakeAsync(() => {
      authService.has.resolves(true);
      component.mmAuth = 'can_configure';
      component.mmAuthAny = [true];

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.false;
    }));

    it('should call any() with permission groups', fakeAsync(() => {
      authService.has.resolves(true);
      authService.any.resolves(true);
      component.mmAuth = 'can_configure';
      component.mmAuthAny = [['can_upgrade'], ['can_export_all']];

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(authService.any.callCount).to.equal(1);
      expect(getElement().classList.contains('hidden')).to.be.false;
    }));

    it('should hide element when any() returns false', fakeAsync(() => {
      authService.has.resolves(true);
      authService.any.resolves(false);
      component.mmAuth = 'can_configure';
      component.mmAuthAny = [['can_upgrade']];

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.true;
    }));

    it('should hide element when mmAuthAny has no valid permission groups', fakeAsync(() => {
      authService.has.resolves(true);
      component.mmAuth = 'can_configure';
      component.mmAuthAny = [123, null];

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.true;
    }));
  });

  describe('combined mmAuth + mmAuthOnline', () => {
    it('should hide when mmAuth passes but mmAuthOnline fails', fakeAsync(() => {
      authService.has.resolves(true);
      authService.online.returns(false);
      component.mmAuth = 'can_configure';
      component.mmAuthOnline = true;

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.true;
    }));

    it('should show when both mmAuth and mmAuthOnline pass', fakeAsync(() => {
      authService.has.resolves(true);
      authService.online.returns(true);
      component.mmAuth = 'can_configure';
      component.mmAuthOnline = true;

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement().classList.contains('hidden')).to.be.false;
    }));
  });
});
