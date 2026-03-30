import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { expect } from 'chai';
import sinon from 'sinon';
import { CookieService } from 'ngx-cookie-service';

import { AppComponent } from '../../../src/ts/app.component';
import { MainLayoutComponent } from '@admin-tool-modules/shell/main-layout.component';
import { HeaderComponent } from '@admin-tool-components/header/header.component';
import { SidebarComponent } from '@admin-tool-components/sidebar/sidebar.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let originalPouchDB;

  beforeEach(waitForAsync(() => {
    originalPouchDB = window.PouchDB;
    const pouchInstance = {
      info: sinon.stub().resolves({ update_seq: 0 }),
      changes: sinon.stub().returns({
        on: sinon.stub().returnsThis(),
        then: sinon.stub(),
        catch: sinon.stub(),
        cancel: sinon.stub(),
      }),
      replicate: { from: sinon.stub(), to: sinon.stub() },
    };
    (window as any).PouchDB = sinon.stub().returns(pouchInstance);

    return TestBed
      .configureTestingModule({
        imports: [
          RouterTestingModule,
          AppComponent,
          MainLayoutComponent,
          HeaderComponent,
          SidebarComponent,
        ],
        providers: [
          provideHttpClient(withInterceptorsFromDi()),
          CookieService,
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
    window.PouchDB = originalPouchDB;
  });

  it('should create the app', () => {
    expect(component).to.exist;
  });

  it('should render the main layout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-main-layout')).to.exist;
  });
});
