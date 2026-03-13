import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { FormsComponent } from '@admin-tool-modules/forms/forms.component';

describe('FormsComponent', () => {
  let component: FormsComponent;
  let fixture: ComponentFixture<FormsComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [FormsComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(FormsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the forms component', () => {
    expect(component).to.exist;
  });

  it('should render the Forms heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Forms');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
