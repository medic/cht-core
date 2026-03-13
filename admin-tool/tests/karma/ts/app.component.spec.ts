import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { expect } from 'chai';

import { AppComponent } from '../../../src/ts/app.component';
import { MainLayoutComponent } from '@admin-tool-modules/shell/main-layout.component';
import { HeaderComponent } from '@admin-tool-components/header/header.component';
import { SidebarComponent } from '@admin-tool-components/sidebar/sidebar.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [
          RouterTestingModule,
          AppComponent,
          MainLayoutComponent,
          HeaderComponent,
          SidebarComponent,
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the app', () => {
    expect(component).to.exist;
  });

  it('should render the main layout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-main-layout')).to.exist;
  });
});
