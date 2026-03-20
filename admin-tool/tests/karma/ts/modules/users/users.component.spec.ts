import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { UsersComponent } from '@admin-tool-modules/users/users.component';
import { AuthService } from '@admin-tool-services/auth.service';
import { UsersService } from '@admin-tool-services/users.service';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [UsersComponent],
        providers: [
          { provide: AuthService, useValue: { has: sinon.stub().resolves(false) } },
          { provide: UsersService, useValue: { getUsers: sinon.stub().resolves([]) } },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(UsersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create the users component', () => {
    expect(component).to.exist;
  });

  it('should render the users-list component', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('users-list')).to.exist;
  });
});