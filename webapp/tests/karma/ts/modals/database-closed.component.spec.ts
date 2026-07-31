import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { DatabaseClosedComponent } from '@mm-modals/database-closed/database-closed.component';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';

describe('DatabaseClosedModal', () => {
  let fixture: ComponentFixture<DatabaseClosedComponent>;
  let matDialogRef;

  beforeEach(() => {
    matDialogRef = { close: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          DatabaseClosedComponent,
          ModalLayoutComponent,
          PanelHeaderComponent,
        ],
        providers: [
          { provide: MatDialogRef, useValue: matDialogRef },
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(DatabaseClosedComponent);
        fixture.detectChanges();
      });
  });

  afterEach(() => sinon.restore());

  it('should not render the Cancel button', () => {
    const cancelButton = fixture.nativeElement.querySelector('[test-id="cancel"]');
    expect(cancelButton).to.not.exist;
  });
});
