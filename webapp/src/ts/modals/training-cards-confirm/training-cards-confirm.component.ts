import { Component } from '@angular/core';

@Component({
  selector: 'training-cards-confirm',
  templateUrl: './training-cards-confirm.component.html'
})
export class TrainingCardsConfirmComponent {

  constructor() {}

  /* private recordPerformanceQuitTraining() {
    this.trackEditDuration?.stop({
      name: [ 'enketo', this.trackMetadata.form, this.trackMetadata.action, 'quit' ].join(':'),
    });
  }*/

  confirmExit() {
    /* if (this.contentError) {
      this.close();
      return;
    }
    this.showConfirmExit = confirm;*/
  }

  quitTraining() {
    /* this.recordPerformanceQuitTraining();

    if (this.nextUrl) {
      this.router.navigateByUrl(this.nextUrl);
    }

    this.close();*/
  }

}
