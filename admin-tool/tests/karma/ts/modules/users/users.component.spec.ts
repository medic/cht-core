import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { UsersComponent } from '@admin-tool-modules/users/users.component';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [UsersComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(UsersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the users component', () => {
    expect(component).to.exist;
  });

  it('should render the Users heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Users');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
