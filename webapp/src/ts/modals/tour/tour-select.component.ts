import { MmModalAbstract } from '../mm-modal/mm-modal';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Component } from '@angular/core';
import { TourService } from '@mm-services/tour.service';

@Component({
  selector: 'tour-select',
  templateUrl: './tour-select.component.html'
})
export class TourSelectComponent extends MmModalAbstract {

  tours: object[];

  constructor(
    private bsModalRef: BsModalRef,
    private tourService: TourService,
  ) {
    super();
  }

  ngOnInit() {
    this.tourService.getTours().then(tours => {
      this.tours = tours.sort((a: any, b: any) => a.order - b.order);
    });
  }

  cancel() {
    this.bsModalRef.hide();
  }

  start(name) {
    this.tourService.start(name);
    this.cancel();
  }

  listTrackBy(index, tour) {
    return tour.id;
  }
}
