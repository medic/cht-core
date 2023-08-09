import { Component, AfterViewInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { take } from 'rxjs/operators';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { UpdateFacilityService } from '@mm-services/update-facility.service';

@Component({
  selector: 'edit-report',
  templateUrl: './edit-report.component.html'
})
export class EditReportComponent implements AfterViewInit {
  static id = 'edit-report-modal';
  private ERROR_UPDATING_FACILITY = 'Error updating facility';
  private ERROR_VALIDATION = 'Validation error';

  report;
  error;
  processing = false;

  constructor(
    private contactTypesService:ContactTypesService,
    private select2SearchService:Select2SearchService,
    private updateFacilityService:UpdateFacilityService,
    private matDialogRef: MatDialogRef<EditReportComponent>,
    @Inject(MAT_DIALOG_DATA) public matDialogData: Record<string, any>,
  ) {
    this.report = this.matDialogData?.report;
  }

  private getSelectElement() {
    return $('#edit-report [name=facility]');
  }

  ngAfterViewInit() {
    this.matDialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(() => this.getSelectElement().select2('close')); // Close the select2 popup

    return this.contactTypesService
      .getPersonTypes()
      .then(types => {
        types = types.map(type => type.id);
        const options = {
          allowNew: false,
          initialValue: this.report?.contact?._id || this.report?.from,
        };
        return this.select2SearchService.init(this.getSelectElement(), types, options);
      })
      .catch(err => console.error('Error initialising select2', err));
  }

  close() {
    this.matDialogRef.close();
  }

  private setError(message, error) {
    this.error = message;
    console.error(this.error, error);
  }

  submit() {
    const docId = this.report?._id;
    const facilityId = this.getSelectElement().val();
    if (!docId) {
      this.setError(this.ERROR_UPDATING_FACILITY, new Error(this.ERROR_VALIDATION));
      return;
    }

    if (!facilityId) {
      this.setError('Please select a facility', new Error(this.ERROR_VALIDATION));
      return;
    }

    if (facilityId === this.report?.from) {
      // Still showing the default phone number because there is no attached contact so no save required
      this.close();
      return;
    }

    this.processing = true;
    return this.updateFacilityService
      .update(docId, facilityId)
      .then(() => this.close())
      .catch(error => this.setError(this.ERROR_UPDATING_FACILITY, error))
      .finally(() => this.processing = false);
  }
}
