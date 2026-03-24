import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SidebarComponent } from '@admin-tool-components/sidebar/sidebar.component';
import { AuthService } from '@admin-tool-services/auth.service';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(waitForAsync(() => {
    const authService = {
      has: sinon.stub().resolves(true),
      any: sinon.stub().resolves(true),
      online: sinon.stub().returns(true),
    };

    return TestBed
      .configureTestingModule({
        imports: [SidebarComponent, RouterTestingModule],
        providers: [
          { provide: AuthService, useValue: authService },
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(SidebarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create the sidebar component', () => {
    expect(component).to.exist;
  });

  it('should render the navigation container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.navigation')).to.exist;
  });

  it('should render exactly 11 navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a');
    expect(links.length).to.equal(11);
  });

  it('should render a navigation list', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('ul')).to.exist;
    const items = compiled.querySelectorAll('li');
    expect(items.length).to.equal(11);
  });

  const expectedNavItems = [
    { label: 'Display', path: '/display' },
    { label: 'Users', path: '/users' },
    { label: 'Authorization', path: '/authorization' },
    { label: 'SMS', path: '/sms' },
    { label: 'Forms', path: '/forms' },
    { label: 'Targets', path: '/targets' },
    { label: 'Images', path: '/images' },
    { label: 'Message Queue', path: '/message-queue' },
    { label: 'Upgrade', path: '/upgrade' },
    { label: 'Export', path: '/export' },
    { label: 'Backup', path: '/backup' },
  ];

  expectedNavItems.forEach(({ label, path }) => {
    it(`should render a "${label}" nav link pointing to "${path}"`, () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const allLinks = Array.from(compiled.querySelectorAll('a'));
      const link = allLinks.find(a => a.textContent!.trim() === label);
      expect(link, `Expected nav link for "${label}" to exist`).to.exist;
      // RouterTestingModule renders routerLink as href with hash
      const href = link!.getAttribute('href');
      expect(href, `Expected href to contain "${path}"`).to.include(path);
    });
  });
});
