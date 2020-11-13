import { MmModalAbstract } from '../mm-modal/mm-modal';
import { TourService } from '@mm-services/tour.service';

import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'tour-select',
  templateUrl: './tour-select.component.html'
})
export class TourSelectComponent extends MmModalAbstract implements OnInit {

  tours: object[];

  constructor(
    private bsModalRef: BsModalRef,
    private tourService: TourService,
  ) {
    super();
  }

  ngOnInit() {
    this.tourService.endCurrent();
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
