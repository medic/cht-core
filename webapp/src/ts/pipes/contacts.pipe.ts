import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterReports'
})
@Injectable({
  providedIn: 'root'
})
export class FilterReportsPipe implements PipeTransform {
  constructor(){}

  transform(reports, reportStartDate) {
    return reports.filter((report) => !reportStartDate || reportStartDate.isBefore(report.reported_date));
  }
}
