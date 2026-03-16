import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { MainLayoutComponent } from '@admin-tool-modules/shell/main-layout.component';
import { HeaderComponent } from '@admin-tool-components/header/header.component';
import { SidebarComponent } from '@admin-tool-components/sidebar/sidebar.component';
import { AuthService } from '@admin-tool-services/auth.service';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(waitForAsync(() => {
    const authService = {
      has: sinon.stub().resolves(true),
      any: sinon.stub().resolves(true),
      online: sinon.stub().returns(true),
    };

    return TestBed
      .configureTestingModule({
        imports: [
          RouterTestingModule,
          MainLayoutComponent,
          HeaderComponent,
          SidebarComponent,
        ],
        providers: [
          { provide: AuthService, useValue: authService },
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(MainLayoutComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create the main layout component', () => {
    expect(component).to.exist;
  });

  it('should render the header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).to.exist;
  });

  it('should render the sidebar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-sidebar')).to.exist;
  });

  it('should render the router outlet', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).to.exist;
  });

  it('should render the body container div', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.body.container')).to.exist;
  });

  it('should render the content div inside the body container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content')).to.exist;
  });
});
