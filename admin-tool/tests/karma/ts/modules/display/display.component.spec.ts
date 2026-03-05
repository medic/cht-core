import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { DisplayComponent } from '@admin-tool-modules/display/display.component';

describe('DisplayComponent', () => {
  let component: DisplayComponent;
  let fixture: ComponentFixture<DisplayComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [DisplayComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DisplayComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the display component', () => {
    expect(component).to.exist;
  });

  it('should render the Display heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Display');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
