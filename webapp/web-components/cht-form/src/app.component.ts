import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { EnketoFormContext, EnketoService } from '@mm-services/enketo.service';
import undoDeathForm from './undo_death_report.json';
import * as medicXpathExtensions from '../../../src/js/enketo/medic-xpath-extensions';
import * as moment from 'moment';
import { toBik_text } from 'bikram-sambat';


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

  private formModel = `
  <model>
    <instance>
        <undo_death_report xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="undo_death_report" prefix="J1!undo_death_report!" delimiter="#" version="2022-08-19 15:59:55">
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <source>user</source>
            <source_id/>
            <contact>
              <_id/>
              <name/>
              <short_name/>
              <patient_id/>
              <date_of_birth>0</date_of_birth>
              <sex/>
              <parent>
                <_id/>
                <parent>
                  <contact>
                    <name/>
                    <phone/>
                  </contact>
                </parent>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden">0</patient_age_in_years>
          <patient_age_in_months tag="hidden">0</patient_age_in_months>
          <patient_age_in_days tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id tag="hidden"/>
          <patient_name tag="hidden"/>
          <patient_short_name tag="hidden"/>
          <patient_display_name tag="hidden"/>
          <undo>
            <undo_information/>
          </undo>
          <data tag="hidden">
            <__confirm_undo/>
            <meta tag="hidden">
              <__patient_uuid/>
              <__patient_id/>
              <__household_uuid/>
              <__source/>
              <__source_id/>
            </meta>
          </data>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </undo_death_report>
      </instance>
    <instance id="contact-summary"/>
  </model>
`;

  private _formHtml : any= null;
    //   private _formHtml = `
// <form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="undo_death_report">
// <section class="form-logo"></section><h3 dir="auto" id="form-title">Undo death report</h3>
// <select id="form-languages" style="display:none;" data-default-lang=""><option value="en">en</option> </select>
//
//
//     <section class="or-group-data or-branch pre-init or-appearance-field-list " name="/undo_death_report/inputs" data-relevant="./source = 'user'"><section class="or-group-data " name="/undo_death_report/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/undo_death_report/inputs/contact/_id:label">What is the patient's name?</span><input type="text" name="/undo_death_report/inputs/contact/_id" data-type-xml="person"></label><section class="or-group-data " name="/undo_death_report/inputs/contact/parent"><section class="or-group-data " name="/undo_death_report/inputs/contact/parent/parent"><section class="or-group-data " name="/undo_death_report/inputs/contact/parent/parent/contact">
//       </section>
//       </section>
//       </section>
//       </section>
//       </section>
//     <section class="or-group-data or-appearance-field-list " name="/undo_death_report/undo"><fieldset class="question simple-select or-appearance-multiline ">
// <fieldset>
// <legend>
// <span lang="en" class="question-label active" data-itext-id="/undo_death_report/undo/undo_information:label">Submitting this form will undo the death report of <span class="or-output" data-value=" /undo_death_report/patient_display_name "> </span>. Are you sure you want to undo the death report?</span><span class="required">*</span>
//           </legend>
// <div class="option-wrapper">
// <label class=""><input type="radio" name="/undo_death_report/undo/undo_information" data-name="/undo_death_report/undo/undo_information" value="yes" data-required="true()" data-constraint=". = 'yes'" data-type-xml="select1"><span lang="" class="option-label active">Yes</span></label><label class=""><input type="radio" name="/undo_death_report/undo/undo_information" data-name="/undo_death_report/undo/undo_information" value="no" data-required="true()" data-constraint=". = 'yes'" data-type-xml="select1"><span lang="" class="option-label active">No</span></label>
// </div>
// </fieldset>
// <span lang="en" class="or-constraint-msg active" data-itext-id="/undo_death_report/undo/undo_information:jr:constraintMsg">Only submit this report if you want to undo the death report.</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
// </fieldset>
//       </section>
//     <section class="or-group-data or-appearance-hidden " name="/undo_death_report/data"><section class="or-group-data " name="/undo_death_report/data/meta">
//       </section>
//       </section>
//
// <fieldset id="or-calculated-items" style="display:none;">
// <label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_age_in_years" data-calculate="floor( difference-in-months(  /undo_death_report/inputs/contact/date_of_birth , today() ) div 12 )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_age_in_months" data-calculate="difference-in-months(  /undo_death_report/inputs/contact/date_of_birth , today() )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_age_in_days" data-calculate="floor(decimal-date-time(today()) - decimal-date-time( /undo_death_report/inputs/contact/date_of_birth ) )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_short_name" data-calculate="../inputs/contact/short_name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/patient_display_name" data-calculate="if(../patient_short_name = '', ../patient_name, concat(../patient_name, ' (', ../patient_short_name, ')'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/__confirm_undo" data-calculate=" /undo_death_report/undo/undo_information " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__patient_uuid" data-calculate="../../../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__patient_id" data-calculate="../../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__household_uuid" data-calculate="../../../inputs/contact/parent/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__source" data-calculate="../../../inputs/source" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/data/meta/__source_id" data-calculate="../../../inputs/source_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/undo_death_report/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
// </fieldset>
// </form>
// `;


  constructor(
    private _enketoService: EnketoService,
  ) {
    console.log('jkuester constructed');

  }

  ngAfterViewInit() {
    console.log('jkuester ngAfterViewInit');

    const zscoreUtil = { };
    const api = { };
    medicXpathExtensions.init(zscoreUtil, toBik_text, moment, api)

    // this.renderForm();
  }
  @Input() set formHtml(value) {
    console.log(`_formHtml set to ${value}`);
    this._formHtml = value;
    if (this._formHtml) {
      this.renderForm();
    }
  }

  private transformXml(form) {
      const $html = $(this._formHtml);
      const hasContactSummary = $(this.formModel).find('> instance[id="contact-summary"]').length === 1;
      return {
        html: $html,
        model: this.formModel,
        title: form.title,
        hasContactSummary: hasContactSummary
      };
  }

  private async renderForm() {

    // This is the form document (form:undo_death_report)
    const form = undoDeathForm;
    const reportContent = null;
    const editedListener = () => {};
    const valuechangeListener = () => {};

    const formContext: EnketoFormContext = {
      selector: '#report-form',
      formDoc: form,
      instanceData: null,
      editedListener,
      valuechangeListener,
      // isFormInModal,
      // userContact,
    };
    const doc = this.transformXml({ title: 'Undo death report' });
    const userSettings = {
      contact_id: 'user_contact_id',
      language: 'en',
    };
    const contactSummary = null;

    await this._enketoService.renderForm(formContext, doc, userSettings, contactSummary);
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
