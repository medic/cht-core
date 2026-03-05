import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { UpgradeComponent } from '@admin-tool-modules/upgrade/upgrade.component';

describe('UpgradeComponent', () => {
  let component: UpgradeComponent;
  let fixture: ComponentFixture<UpgradeComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [UpgradeComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(UpgradeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the upgrade component', () => {
    expect(component).to.exist;
  });

  it('should render the Upgrade heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Upgrade');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
