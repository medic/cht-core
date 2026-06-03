import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguagesService } from '@admin-tool-services/languages.service';
import { LanguageDoc, LanguageValidation } from '../../display-interfaces';
import { ResponseStatus } from '@admin-tool-modules/global-modules-interfaces';

/**
 * Modal component for adding and editing language documents in the CHT instance.
 * Controlled by the parent via the visible input.
 * In add mode, doc is null and the form is empty with code enabled.
 * In edit mode, doc is the existing language document and code is disabled.
 * Emits closed when the modal is dismissed and saved when the language is saved successfully.
 */
@Component({
  selector: 'display-languages-edit',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './display-languages-edit.component.html',
  styleUrl: './display-languages-edit.component.less'
})
export class DisplayLanguagesEditComponent implements OnChanges {

  /** Controls visibility of the modal */
  @Input() visible = false;

  /** Language document to edit, or null when adding a new language */
  @Input() doc: LanguageDoc | null=null;

  /** Emitted when the modal is dismissed without saving */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when the language is saved successfully */
  @Output() saved = new EventEmitter<LanguageDoc>();

  /** Form model for the language being added or edited */
  model: Partial<LanguageDoc> = {
    code: '',
    name: '',
    rtl: false,
  };

  /** Validation errors for the form fields */
  languageErrors: LanguageValidation = {};

  /** Controls visibility of the submitting state on the submit button */
  loadingModalState = false;

  /** Tracks the state of the save operation for error display in the footer */
  responseStatus: ResponseStatus = {};

  constructor(private languagesService: LanguagesService, private translate: TranslateService) {}

  /**
   * Initializes or resets the form model when the modal becomes visible.
   * In edit mode, preloads the model with the existing document values.
   * In add mode, resets the model to empty values.
   * Clears errors and loading state on every open.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      if (this.doc) {
        this.model = { code: this.doc.code, name: this.doc.name, rtl: this.doc.rtl ?? false };
      } else {
        this.model = { code: '', name: '', rtl: false };
      }
      this.languageErrors = {};
      this.loadingModalState = false;
    }
  }

  /**
   * Validates the form fields and populates languageErrors.
   * Both code and name are required.
   * Uses TranslateService to produce localized error messages.
   *
   * @returns {boolean} true if the form is valid, false otherwise
   */
  private validate(): boolean {
    this.languageErrors = {};
    
    if (!this.model.code) {
      this.languageErrors.code = this.translate.instant('field is required', {
        field: this.translate.instant('Language code')
      });
    }
    if (!this.model.name) {
      this.languageErrors.name = this.translate.instant('field is required', {
        field: this.translate.instant('Name')
      });
    }
    return !Object.keys(this.languageErrors).length;
  }

  /**
   * Builds the language document from the form model and saves it via LanguagesService.
   * For new languages, _id is assigned by saveLanguage as 'messages-' + code.
   * For existing languages, _id, _rev, generic and custom are preserved from the original doc.
   * Shows an error message in the footer if the save fails.
   *
   * @returns {Promise<void>}
   */
  async submit(): Promise<void> {
    if (!this.validate()) {
      return;
    }

    this.loadingModalState = true;
    this.responseStatus = {};

    try {
      const { code, name, rtl } = this.model;
      const doc: LanguageDoc = {
        _id: this.doc?._id ?? '',
        _rev: this.doc?._rev,
        code: code!,
        name: name!,
        rtl: rtl ?? false,
        type: 'translations',
        generic: this.doc?.generic ?? {},
        custom: this.doc?.custom,
      };
      await this.languagesService.saveLanguage(doc);
      this.saved.emit();
      this.closed.emit();
    } catch (error) {
      console.error('Error saving language', error);
      this.responseStatus = { state: 'error', msg: 'Error saving settings' };
    } finally {
      this.loadingModalState = false;
    }
  }

  /**
   * Dismisses the modal without saving by emitting the closed event.
   */
  cancel(): void {
    this.closed.emit();
  }


}
