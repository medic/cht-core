import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { HeaderComponent } from '@admin-tool-components/header/header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [HeaderComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the header component', () => {
    expect(component).to.exist;
  });

  it('should display the application brand name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const brand = compiled.querySelector('.navbar-brand');
    expect(brand).to.exist;
    expect(brand!.textContent).to.contain('Admin');
  });

  it('should render a navigation bar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('nav.header')).to.exist;
  });

  it('should render a logout link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a');
    const logoutLink = Array.from(links).find(a => a.textContent!.trim().toLowerCase().includes('logout'));
    expect(logoutLink).to.exist;
  });

  it('should render a navbar-right section for the logout action', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.navbar-right')).to.exist;
  });
});
