import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TrainingCardsService {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public isTrainingCardForm(formInternalId): boolean {
    throw new Error('Method not implemented.');
  }

  public getTrainingCardDocId() {
    throw new Error('Method not implemented.');
  }
}
