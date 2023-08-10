import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { EnketoService} from '@mm-services/enketo.service';
import undoDeathForm from './undo_death_report.json';

@Component({
  selector: 'cht-form',
  templateUrl: './app.component.html',
})
export class AppComponent implements AfterViewInit {
  // string: (optional) modal element id
  @Input() formId;
  // string: (optional) data to include in the data-editing attribute
  @Input() editing;
  // object: object with 'saving', and 'error' properties to update form status
  @Input() status;
  // function: to be called when cancelling out of the form
  @Output() onCancel: EventEmitter<any> = new EventEmitter();
  // function: to be called when submitting the form
  @Output() onSubmit: EventEmitter<any> = new EventEmitter();

  @Input() thankyouMessage = 'Thanks!';

  constructor(
    private _enketoService: EnketoService,
  ) {
    console.log('jkuester constructed');

  }

  ngAfterViewInit() {
    console.log('jkuester ngAfterViewInit');
    this.renderForm();
  }

  private async renderForm() {

    // This is the form document (form:undo_death_report)
    const form = undoDeathForm;
    const reportContent = null;
    const editedListener = () => {};
    const valueChangeListener = () => {};

    await this._enketoService.render('#report-form', form, reportContent, editedListener, valueChangeListener);
  }
  //
  //
  // // string: (optional) modal element id
  // @Input() formId;
  // // string: (optional) data to include in the data-editing attribute
  // @Input() editing;
  // // object: object with 'saving', and 'error' properties to update form status
  // @Input() status;
  // // function: to be called when cancelling out of the form
  // @Output() onCancel: EventEmitter<any> = new EventEmitter();
  // // function: to be called when submitting the form
  // @Output() onSubmit: EventEmitter<any> = new EventEmitter();
  //
  // @Output() enketoService = this._enketoService;
}
