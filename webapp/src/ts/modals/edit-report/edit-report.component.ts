import { Component, AfterViewInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { UpdateFacilityService } from '@mm-services/update-facility.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'edit-report',
  templateUrl: './edit-report.component.html'
})
export class EditReportComponent extends MmModalAbstract implements AfterViewInit {
  static id = 'edit-report-modal';

  model:any = { report: {} };

  constructor(
    bsModalRef: BsModalRef,
    private contactTypesService:ContactTypesService,
    private select2SearchService:Select2SearchService,
    private updateFacilityService:UpdateFacilityService,
  ) {
    super(bsModalRef);
    bsModalRef.onHidden
      ?.pipe(take(1)) // so we don't need to unsubscribe
      // close the select2 popup
      .subscribe(() => this.getSelectElement().select2('close'));
  }

  private getSelectElement() {
    return $('#edit-report [name=facility]');
  }

  ngAfterViewInit() {
    return this.contactTypesService
      .getPersonTypes()
      .then(types => {
        types = types.map(type => type.id);
        const options = {
          allowNew: false,
          initialValue: this.model?.report?.contact?._id || this.model?.report?.from,
        };
        return this.select2SearchService.init(this.getSelectElement(), types, options);
      })
      .catch(err => console.error('Error initialising select2', err));
  }

  submit() {
    const docId = this.model?.report?._id;
    const facilityId = this.getSelectElement().val();
    if (!docId) {
      this.setError(new Error('Validation error'), 'Error updating facility');
      return;
    }

    if (!facilityId) {
      this.setError(new Error('Validation error'), 'Please select a facility');
      return;
    }

    if (facilityId === this.model?.report?.from) {
      // Still showing the default phone number because there is no attached
      // contact so no save required
      this.close();
      return;
    }

    this.setProcessing();
    return this.updateFacilityService
      .update(docId, facilityId)
      .then(() => {
        this.setFinished();
        this.close();
      })
      .catch((err) => {
        this.setError(err, 'Error updating facility');
      });
  }
}
