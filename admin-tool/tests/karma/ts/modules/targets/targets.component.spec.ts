import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { TargetsComponent } from '@admin-tool-modules/targets/targets.component';

describe('TargetsComponent', () => {
  let component: TargetsComponent;
  let fixture: ComponentFixture<TargetsComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [TargetsComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TargetsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the targets component', () => {
    expect(component).to.exist;
  });

  it('should render the Targets heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Targets');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
