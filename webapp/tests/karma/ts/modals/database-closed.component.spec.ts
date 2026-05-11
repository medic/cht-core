import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { DatabaseClosedComponent } from '@mm-modals/database-closed/database-closed.component';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';

describe('DatabaseClosedModal', () => {
  let fixture: ComponentFixture<DatabaseClosedComponent>;
  let matDialogRef;
  let router: Router;

  beforeEach(() => {
    matDialogRef = { close: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
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
        router = TestBed.inject(Router);
        fixture.detectChanges();
      });
  });

  afterEach(() => sinon.restore());

  it('should not render the Cancel button', () => {
    const cancelButton = fixture.nativeElement.querySelector('[test-id="cancel"]');
    expect(cancelButton).to.not.exist;
  });

  it('should not close when router navigates', fakeAsync(async () => {
    await router.navigate(['/']);
    flush();
    expect(matDialogRef.close.callCount).to.equal(0);
  }));
});
