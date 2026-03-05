import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { AuthorizationComponent } from '@admin-tool-modules/authorization/authorization.component';

describe('AuthorizationComponent', () => {
  let component: AuthorizationComponent;
  let fixture: ComponentFixture<AuthorizationComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [AuthorizationComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AuthorizationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the authorization component', () => {
    expect(component).to.exist;
  });

  it('should render the Authorization heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Authorization');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
