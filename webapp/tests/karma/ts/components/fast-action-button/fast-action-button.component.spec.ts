import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FastActionButtonComponent } from './fast-action-button.component';

describe('FastActionButtonComponent', () => {
  let component: FastActionButtonComponent;
  let fixture: ComponentFixture<FastActionButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FastActionButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FastActionButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
