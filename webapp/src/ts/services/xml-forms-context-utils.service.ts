import * as moment from 'moment';
import { Injectable } from '@angular/core';

/**
 * Util functions available to a form doc's `.context` function for checking if
 * a form is relevant to a specific contact.
 */
@Injectable({
  providedIn: 'root'
})
export class XmlFormsContextUtilsService {
  constructor() {}

  private getDateDiff(contact, unit) {
    if (!contact || !contact.date_of_birth) {
      return;
    }
    const dob = moment(contact.date_of_birth).startOf('day');
    return moment().diff(dob, unit);
  }

  ageInDays(contact) {
    return this.getDateDiff(contact, 'days');
  }

  ageInMonths(contact) {
    return this.getDateDiff(contact, 'months');
  }

  ageInYears(contact) {
    return this.getDateDiff(contact, 'years');
  }

}
