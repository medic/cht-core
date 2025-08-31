import { Pipe, PipeTransform } from '@angular/core';

// Helps to make sure that the processValueFn is only executed once for each value (until it changes)
@Pipe({
  name: 'processValue',
  pure: true // default, but explicit for clarity
})
export class ProcessValuePipe implements PipeTransform {
  constructor() {}

  transform(
    key: string,
    cellValue: any,
    rowIndex: number,
    tableRowCount: number,
    rowData: any,
    processor: (key: string, cellValue: any, rowIndex: number, tableRowCount: number, rowData: any) => any
  ): any {
    return processor ? processor(key, cellValue, rowIndex, tableRowCount, rowData) : cellValue;
  }
}
