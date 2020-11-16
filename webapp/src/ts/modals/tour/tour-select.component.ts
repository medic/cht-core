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
    bsModalRef: BsModalRef,
    private tourService: TourService,
  ) {
    super(bsModalRef);
  }

  ngOnInit() {
    this.tourService.endCurrent();
    this.tourService.getTours().then(tours => {
      this.tours = tours.sort((a: any, b: any) => a.order - b.order);
    });
  }

  start(name) {
    this.tourService.start(name);
    this.close();
  }

  listTrackBy(index, tour) {
    return tour.id;
  }
}
