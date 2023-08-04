import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class ContactSummaryService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get(contact, reports, lineage, targetDoc?): any {
    throw new Error('Method not implemented.');
  }
}
