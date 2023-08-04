import { Component, AfterViewInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { UpdateFacilityService } from '@mm-services/update-facility.service';

@Component({
  selector: 'edit-report',
  templateUrl: './edit-report.component.html'
})
export class EditReportComponent implements AfterViewInit {
  static id = 'edit-report-modal';

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

  submit() {
    const docId = this.report?._id;
    const facilityId = this.getSelectElement().val();
    if (!docId) {
      this.error = 'Error updating facility';
      console.error(this.error, new Error('Validation error'));
      return;
    }

    if (!facilityId) {
      this.error = 'Please select a facility';
      console.error(this.error, new Error('Validation error'));
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
      .catch(error => {
        this.error = 'Error updating facility';
        console.error(this.error, error);
      })
      .finally(() => this.processing = false);
  }
}
