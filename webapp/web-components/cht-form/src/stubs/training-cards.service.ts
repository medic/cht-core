import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
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
