import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class TrainingCardsService {

  public isTrainingCardForm(formInternalId): boolean {
    throw new Error('Method not implemented.');
  }

  public getTrainingCardDocId() {
    throw new Error('Method not implemented.');
  }
}
