import * as moment from 'moment';
import { distance } from 'fastest-levenshtein';
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

  // The Levenshtein distance is a measure of the number of edits (insertions, deletions, and substitutions) 
  // required to change one string into another.
  levenshteinEq(current: string, existing: string, threshold: number = 3){
    return typeof current === 'string' && typeof existing === 'string' ? 
      distance(current, existing) <= threshold : current === existing;
  }

  private readonly normalizedDistance = (str1: string, str2: string) :number => {
    const maxLen = Math.max(str1.length, str2.length);
    return (maxLen === 0) ? 0 : (distance(str1, str2) / maxLen);
  };

  // Normalize the distance by dividing by the length of the longer string. 
  // This can make the metric more adaptable across different string lengths
  normalizedLevenshteinEq(current: string, existing: string, threshold: number = 0.42857142857142855){
    return typeof current === 'string' && typeof existing === 'string' ? 
      this.normalizedDistance(current, existing)  <= threshold : current === existing;
  }
}
