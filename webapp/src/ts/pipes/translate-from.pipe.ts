import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { TranslateFromService } from '@mm-services/translate-from.service';


/**
 * Filter version of TranslateFrom service.
 *
 * Example of use :
 * // In controller :
 * $scope.task = {
 *	intructionsLabel: [ { locale: 'en', content: 'Go visit {{task.patient.name}}' }],
 *	patient: { name: 'Estelle'}
 * };
 *
 * // In template : (yields 'Go visit Estelle')
 * {{task.intructionsLabel | translateFrom:task}}
 */
@Pipe({
  name: 'translateFrom'
})
@Injectable({
  providedIn: 'root'
})
export class TranslateFromPipe implements PipeTransform {
  constructor(
    private translateFromService:TranslateFromService,
  ) {
  }

  transform(value, scope?) {
    return this.translateFromService.get(value, scope);
  }
}
