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
    if (!reports) {
      return [];
    }
    return reports.filter((report) => !reportStartDate || reportStartDate.isBefore(report.reported_date));
  }
}

@Pipe({
  name: 'filterTasks'
})
@Injectable({
  providedIn: 'root'
})
export class FilterTasksPipe implements PipeTransform {
  constructor(){}

  transform(tasks, taskEndDate) {
    return tasks.filter((task) => !taskEndDate || task.dueDate <= taskEndDate);
  }
}
