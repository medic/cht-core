import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterReports'
})
@Injectable({
  providedIn: 'root'
})
export class FilterReportsPipe implements PipeTransform {
  constructor(){}

  transform(report, reportStartDate) {
    console.log('pipe called with', report, reportStartDate);
    return !reportStartDate || reportStartDate.isBefore(report.reported_date);
  }
}
