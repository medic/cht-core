import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnChanges, 
  SimpleChanges, 
  ViewChildren, 
  QueryList, 
  ElementRef, 
  ViewChild 
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguagesService } from '@admin-tool-services/languages.service';
import { LanguageDoc, TranslationKeyValues } from '../../display-interfaces';
import { ResponseStatus } from '@admin-tool-modules/global-modules-interfaces';

/**
 * Modal component for adding and editing translation keys across all language documents.
 * Controlled by the parent via the visible input.
 * In add mode, key is null and the form is empty with the key field enabled.
 * In edit mode, key is the existing translation key and the key field is disabled.
 * Emits closed when the modal is dismissed and saved when the translation is saved successfully.
 * The Delete button is only visible when the key exists in the custom field of at least one document.
 */
@Component({
  selector: 'display-translations-edit',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './display-translations-edit.component.html',
  styleUrl: './display-translations-edit.component.less'
})
export class DisplayTranslationsEditComponent implements OnChanges{

  /** Controls visibility of the modal */
  @Input() visible = false;

  /** Translation key to edit, or null when adding a new key */
  @Input() key: string | null = null;

  /** All language documents available, used to build the form and save translations */
  @Input() docs: LanguageDoc[] = [];

  /** Emitted when the modal is dismissed without saving */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when the translation is saved successfully */
  @Output() saved = new EventEmitter<void>();

  /** References to all textarea elements for resetting their size on modal open */
  @ViewChildren('translationTextarea') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;

  /** Reference to the modal body element for resetting scroll position on modal open */
  @ViewChild('modalBody') modalBody!: ElementRef<HTMLDivElement>;

  /** Form model — maps each language code to the translation value for the current key */
  translationValues: TranslationKeyValues = {};

  /** Controls visibility of the submitting state on the submit button */
  loadingModalState = false;

  /** Tracks the state of the save operation for error display in the footer */
  responseStatus: ResponseStatus = {};

  /** Validation error for the key field */
  keyError: string | null = null;

  /** The key value bound to the key input — preloaded from key in edit mode, empty in add mode */
  newKey = '';

  /** True when the current key exists in the custom field of at least one language document
   * controls Delete button visibility */
  isCustom = false;

  constructor(private languagesService: LanguagesService, private translate: TranslateService){}
  
  /**
   * Resets the modal state when it becomes visible.
   * In edit mode, preloads newKey and translationValues from the existing documents.
   * Resets textarea sizes and scrolls the modal body to the top on every open.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.newKey = '';
      this.loadingModalState = false;
      this.responseStatus = {};
      this.keyError = null;
      this.translationValues = {};

      this.isCustom = this.docs.some(doc => doc.custom && this.key! in doc.custom);

      if (this.key) {
        this.newKey = this.key;
        this.docs.forEach(doc => {
          const values = { ...doc.generic, ...doc.custom };
          this.translationValues[doc.code] = values[this.key!] ?? '';
        });
      }
      this.textareas.forEach(textarea => {
        textarea.nativeElement.style.height = '';
        textarea.nativeElement.style.width = '';
      });
      (window.requestAnimationFrame || (window as any).webkitRequestAnimationFrame)(() => {
        if (this.modalBody) {
          this.modalBody.nativeElement.scrollTop = 0;
        }
      });
    }
  }

  /**
   * Validates the key field.
   * In add mode, newKey is required.
   * In edit mode, validation always passes since key is already set.
   *
   * @returns {boolean} true if the form is valid, false otherwise
   */
  private validate(): boolean {
    this.keyError = null;

    if (!this.key) {
      if (!this.newKey) {
        this.keyError = this.translate.instant('field is required', {
          field: this.translate.instant('translation.key')
        });
        return false;
      }
    }
    return true;
  }

  /**
   * Saves the translation across all language documents via LanguagesService.
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
      await this.languagesService.saveTranslation(this.newKey, this.translationValues, this.docs);
      this.saved.emit();
      this.closed.emit();
    } catch (error) {
      console.error('Error saving translation', error);
      this.responseStatus = { state: 'error', msg: 'Error updating settings' };
    } finally {
      this.loadingModalState = false;
    }
  }

  /**
   * Deletes the translation key from all language documents by saving empty values.
   * Only available when isCustom is true.
   * Shows an error message in the footer if the delete fails.
   *
   * @returns {Promise<void>}
   */
  async deleteTranslation(): Promise<void> {
    this.loadingModalState = true;
    this.responseStatus = {};

    try {
      const emptyValues: TranslationKeyValues = {};
      this.docs.forEach(doc => {
        emptyValues[doc.code] = '';
      });
      await this.languagesService.saveTranslation(this.newKey, emptyValues, this.docs);
      this.saved.emit();
      this.closed.emit();
    } catch (error) {
      console.error('Error deleting translation', error);
      this.responseStatus = { state: 'error', msg: 'Error updating settings' };
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
