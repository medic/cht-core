import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContactSummaryService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get(contact, reports, lineage, targetDoc?): any {
    throw new Error('Method not implemented.');
  }
}
