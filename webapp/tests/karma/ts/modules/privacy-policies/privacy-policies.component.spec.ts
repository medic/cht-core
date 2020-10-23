import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivacyPoliciesComponent } from './privacy-policies.component';

describe('PrivacyPoliciesComponent', () => {
  let component: PrivacyPoliciesComponent;
  let fixture: ComponentFixture<PrivacyPoliciesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PrivacyPoliciesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrivacyPoliciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
