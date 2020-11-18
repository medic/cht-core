import { MmModalAbstract } from '../mm-modal/mm-modal';
import { TourService } from '@mm-services/tour.service';

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { Selectors } from '@mm-selectors/index';
import { Store } from '@ngrx/store';

@Component({
  selector: 'tour-select',
  templateUrl: './tour-select.component.html'
})
export class TourSelectComponent extends MmModalAbstract implements OnInit, OnDestroy {

  @Input() minimalTabs = false;

  tours: object[];

  subscription: Subscription = new Subscription();

  constructor(
    bsModalRef: BsModalRef,
    private store: Store,
    private tourService: TourService,
  ) {
    super(bsModalRef);
  }

  ngOnInit() {
    const subscription = this.store
      .select(Selectors.getMinimalTabs)
      .subscribe(minimalTabs => {
        this.minimalTabs = minimalTabs;
      });
    this.subscription.add(subscription);
    this.tourService.endCurrent();
    this.tourService.getTours().then(tours => {
      this.tours = tours.sort((a: any, b: any) => a.order - b.order);
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  start(name) {
    this.tourService.start(name);
    this.close();
  }

  listTrackBy(index, tour) {
    return tour.id;
  }
}
