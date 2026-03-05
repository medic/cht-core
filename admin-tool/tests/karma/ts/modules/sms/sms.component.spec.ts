import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { SmsComponent } from '@admin-tool-modules/sms/sms.component';

describe('SmsComponent', () => {
  let component: SmsComponent;
  let fixture: ComponentFixture<SmsComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [SmsComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(SmsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the SMS component', () => {
    expect(component).to.exist;
  });

  it('should render the SMS heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('SMS');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
