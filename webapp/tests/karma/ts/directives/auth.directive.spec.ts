import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import { By } from '@angular/platform-browser';
import sinon from 'sinon';
import { Component, OnInit } from '@angular/core';

import { AuthDirective } from '@mm-directives/auth.directive';
import { AuthService } from '@mm-services/auth.service';
import { over } from 'lodash-es';


@Component({
  template: `
    
    
    
    
    
   
    
    
    
    
    
    
    `
})
class TestComponent {
}

describe('Auth directive', () => {
  let fixture;
  let authServiceMock;

  beforeEach(() => {
    authServiceMock = {
      has: sinon.stub().resolves(),
      online: sinon.stub(),
      any: sinon.stub().resolves(),
    };

    TestBed.configureTestingModule({
      declarations: [ AuthDirective, TestComponent ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
      ]
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  const override = async (template) => {
    TestBed.overrideComponent(TestComponent, { set: { template } });
    fixture = TestBed.createComponent(TestComponent);

    fixture.detectChanges();
    await fixture.whenRenderingDone();
    fixture.detectChanges();
  };

  it('should be shown when auth does not error', async(async () => {
    authServiceMock.has.resolves(true);
    await override('<a mmAuth="can_do_stuff"></a>');

    expect(authServiceMock.has.callCount).to.equal(1);
    expect(authServiceMock.has.args[0][0]).to.deep.equal(['can_do_stuff']);
    const element = fixture.debugElement.query(By.directive(AuthDirective));
    expect(element.classes.hidden).to.equal(undefined);
  }));


  it('should be hidden when auth fails', async(async () => {
    authServiceMock.has.resolves(false);
    await override('<a mmAuth="can_do_stuff"></a>');

    expect(authServiceMock.has.callCount).to.equal(1);
    expect(authServiceMock.has.args[0][0]).to.deep.equal(['can_do_stuff']);
    const element = fixture.debugElement.query(By.directive(AuthDirective));
    expect(element.classes.hidden).to.equal(true);
  }));

  it('splits comma separated permissions',  async(async () => {
    authServiceMock.has.resolves(true);
    await override('<a mmAuth="can_do_stuff,!can_not_do_stuff"></a>');

    expect(authServiceMock.has.callCount).to.equal(1);
    expect(authServiceMock.has.args[0][0]).to.deep.equal(['can_do_stuff', '!can_not_do_stuff']);
    const element = fixture.debugElement.query(By.directive(AuthDirective));
    expect(element.classes.hidden).to.equal(undefined);
  }));

  describe('mmAuthOnline', () => {
    it('should be shown when auth does not error',  async(async () => {
      authServiceMock.online.returns(true);
      await override('<a mmAuth [mmAuthOnline]="true"></a>');

      expect(authServiceMock.online.callCount).to.equal(1);
      expect(authServiceMock.online.args[0]).to.deep.equal([true]);
      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(undefined);
    }));

    it('should be hidden when auth errors', async(async () => {
      authServiceMock.online.returns(true);
      await override('<a mmAuth [mmAuthOnline]="false"></a>');

      expect(authServiceMock.online.callCount).to.equal(1);
      expect(authServiceMock.online.args[0]).to.deep.equal([false]);
      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(undefined);
    }));

    it('parses the attribute value', async(async () => {
      authServiceMock.online.returns(true);
      await override('<a mmAuth [mmAuthOnline]="1 + 2 + 3"></a>');

      expect(authServiceMock.online.callCount).to.equal(1);
      expect(authServiceMock.online.args[0]).to.deep.equal([6]);
      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(undefined);
    }));
  });

  describe('mmAuth + mmAuthOnline', () => {
    it('should be shown when both do not err', async(async () => {
      authServiceMock.has.returns(true);
      authServiceMock.online.returns(true);
      await override(' <a mmAuth="permission_to_have" [mmAuthOnline]="true"></a>');

      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(undefined);
      expect(authServiceMock.online.callCount).to.equal(1);
      expect(authServiceMock.online.args[0]).to.deep.equal([true]);
      expect(authServiceMock.has.callCount).to.equal(1);
      expect(authServiceMock.has.args[0][0]).to.deep.equal(['permission_to_have']);
    }));

    it('should be hidden when online succeeds and permissions err', async(async () => {
      authServiceMock.has.returns(false);
      authServiceMock.online.returns(true);
      await override('<a mmAuth="permission_to_have" [mmAuthOnline]="false"></a>');

      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(true);
      expect(authServiceMock.online.callCount).to.equal(1);
      expect(authServiceMock.online.args[0]).to.deep.equal([false]);
      expect(authServiceMock.has.callCount).to.equal(1);
      expect(authServiceMock.has.args[0][0]).to.deep.equal(['permission_to_have']);
    }));

    it('should be hidden when online fails and permissions succeed', async(async () => {
      authServiceMock.has.returns(true);
      authServiceMock.online.returns(false);
      await override('<a mmAuth="permission_to_have" [mmAuthOnline]="true"></a>');

      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(true);
      expect(authServiceMock.online.callCount).to.equal(1);
      expect(authServiceMock.online.args[0]).to.deep.equal([true]);
      expect(authServiceMock.has.callCount).to.equal(1);
      expect(authServiceMock.has.args[0][0]).to.deep.equal(['permission_to_have']);
    }));

    it('should be hidden when online fails and auth any succeeds', async(async () => {
      authServiceMock.any.resolves(true);
      authServiceMock.online.returns(false);
      await override('<a mmAuth [mmAuthAny]="[\'permission_to_have\', \'another_permission\']" [mmAuthOnline]="true"></a>');

      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(true);
    }));

    it('should be hidden when both fail', async(async () => {
      authServiceMock.has.resolves(false);
      authServiceMock.online.returns(false);
      await override('<a mmAuth="permission_to_have" [mmAuthOnline]="false"></a>');

      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(true);
      expect(authServiceMock.online.callCount).to.equal(1);
      expect(authServiceMock.online.args[0]).to.deep.equal([false]);
      expect(authServiceMock.has.callCount).to.equal(1);
      expect(authServiceMock.has.args[0][0]).to.deep.equal(['permission_to_have']);
    }));
  });

  describe('any', () => {
    it('should be hidden with false parameter(s)', async(async () => {
      await override('<a mmAuth [mmAuthAny]="false"></a>');
      const element = fixture.debugElement.query(By.directive(AuthDirective));

      expect(element.classes.hidden).to.equal(true);
      expect(authServiceMock.any.callCount).to.equal(0);
    }));

    it('should be hidden with false parameter(s)', async(async () => {
      await override('<a mmAuth [mmAuthAny]="[false, false, false]"></a>');
      const element = fixture.debugElement.query(By.directive(AuthDirective));

      expect(element.classes.hidden).to.equal(true);
      expect(authServiceMock.any.callCount).to.equal(0);
    }));

    it('should be hidden with false parameter(s)', async(async () => {
      await override('<a mmAuth [mmAuthAny]="true"></a>');
      const element = fixture.debugElement.query(By.directive(AuthDirective));

      expect(element.classes.hidden).to.equal(undefined);
      expect(authServiceMock.any.callCount).to.equal(0);
    }));

    it('should be hidden with false parameter(s)', async(async () => {
      await override('<a mmAuth [mmAuthAny]="[false, false, true, false, true]"></a>');
      const element = fixture.debugElement.query(By.directive(AuthDirective));

      expect(element.classes.hidden).to.equal(undefined);
      expect(authServiceMock.any.callCount).to.equal(0);
    }));

    it('should be shown with at least one allowed permission',async(async () => {
      authServiceMock.any.resolves(true);
      await override('<a mmAuth [mmAuthAny]="[\'perm1\', \'perm2\']"></a>');
      const element = fixture.debugElement.query(By.directive(AuthDirective));

      expect(element.classes.hidden).to.equal(undefined);
      expect(authServiceMock.any.callCount).to.equal(1);
      expect(authServiceMock.any.args[0][0]).to.deep.equal([['perm1'], ['perm2']]);
    }));

    it('should be hidden with no allowed permissions', async(async () => {
      authServiceMock.any.resolves(false);
      await override('<a mmAuth [mmAuthAny]="[\'perm1\', \'perm2\']"></a>');
      const element = fixture.debugElement.query(By.directive(AuthDirective));

      expect(element.classes.hidden).to.equal(true);
      expect(authServiceMock.any.callCount).to.equal(1);
      expect(authServiceMock.any.args[0][0]).to.deep.equal([['perm1'], ['perm2']]);
    }));

    it('should work with stacked permissions',  async(async () => {
      authServiceMock.any.withArgs([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g']]).resolves(true);
      await override('<a mmAuth [mmAuthAny]="[[\'a\', \'b\'], [[\'c\', \'d\']], [[[\'e\', \'f\']]], \'g\']"></a>');

      const element = fixture.debugElement.query(By.directive(AuthDirective));
      expect(element.classes.hidden).to.equal(undefined);
      expect(authServiceMock.any.callCount).to.equal(1);
      expect(authServiceMock.any.args[0][0]).to.deep.equal([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g']]);
    }));

    it('should work with expressions ', async(async () => {
      authServiceMock.any.withArgs([['a', 'b'], ['f']]).resolves(false);
      await override('<a mmAuth [mmAuthAny]="[true && [\'a\', \'b\'], false && [\'c\', \'d\'], \'f\']"></a>');
      const element = fixture.debugElement.query(By.directive(AuthDirective));

      expect(element.classes.hidden).to.equal(true);
      expect(authServiceMock.any.callCount).to.equal(1);
      expect(authServiceMock.any.args[0][0]).to.deep.equal([['a', 'b'], ['f']]);
    }));
  });

});

