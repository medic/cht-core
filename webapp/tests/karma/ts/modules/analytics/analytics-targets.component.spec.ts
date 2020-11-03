import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsTargetsComponent } from './analytics-targets.component';

describe('AnalyticsTargetsComponent', () => {
  let component: AnalyticsTargetsComponent;
  let fixture: ComponentFixture<AnalyticsTargetsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AnalyticsTargetsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalyticsTargetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
