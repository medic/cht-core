import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteDocConfirmComponent } from './delete-doc-confirm.component';

describe('DeleteDocConfirmComponent', () => {
  let component: DeleteDocConfirmComponent;
  let fixture: ComponentFixture<DeleteDocConfirmComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeleteDocConfirmComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteDocConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
