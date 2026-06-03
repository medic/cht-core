import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguagesService } from '@admin-tool-services/languages.service';
import { LanguageDoc } from '../../display-interfaces';
import { ResponseStatus } from '@admin-tool-modules/global-modules-interfaces';

/**
 * Modal component for confirming the deletion of a language document in the CHT instance.
 * Controlled by the parent via the visible input.
 * Emits closed when the modal is dismissed and confirmed when the language is deleted successfully.
 */
@Component({
  selector: 'display-languages-delete',
  imports: [TranslatePipe],
  templateUrl: './display-languages-delete.component.html',
  styleUrl: './display-languages-delete.component.less'
})
export class DisplayLanguagesDeleteComponent implements OnChanges {

  /** Controls visibility of the modal */
  @Input() visible = false;

  /** Language document to delete */
  @Input() doc: LanguageDoc | null = null;

  /** Code of the language currently set as the default application locale in settings */
  @Input() localeLanguage: string | null = null;

  /** Code of the language currently set as the outgoing messages locale in settings */
  @Input() localeOutgoingLanguage: string | null = null;

  /** Emitted when the modal is dismissed without saving */
  @Output() closed = new EventEmitter<void>();
  
  /** Emitted when the language is deleted successfully */
  @Output() confirmed = new EventEmitter<void>();

  /** Controls visibility of the deleting state on the delete button */
  loadingModalState = false;

  /** Tracks the state of the delete operation for error display in the footer */
  responseStatus: ResponseStatus = {};

  constructor(private languagesService: LanguagesService){}

  /**
   * Resets the modal state when it becomes visible.
   * Clears loading state and response status on every open.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.loadingModalState = false;
      this.responseStatus = {};
    }
  }

  /**
   * Validates that the language is not currently in use as the default application
   * locale or the outgoing messages locale before proceeding with deletion.
   * Shows an error message in the footer if the language is in use.
   * Deletes the language document via LanguagesService if validation passes.
   * Shows an error message in the footer if the delete fails.
   *
   * @returns {Promise<void>}
   */
  async confirmDelete(): Promise<void> {
    if (this.doc?.code === this.localeLanguage || this.doc?.code === this.localeOutgoingLanguage) {
      this.responseStatus = { state: 'error', msg: 'Language in use as default and/or outgoing locale' };
      return;
    }

    this.loadingModalState = true;
    this.responseStatus = {};

    try {
      await this.languagesService.deleteLanguage(this.doc!);
      this.confirmed.emit();
      this.closed.emit();
    } catch (error) {
      console.error('Error deleting language', error);
      this.responseStatus = { state: 'error', msg: 'Error deleting document' };
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
