import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguagesService } from '@admin-tool-services/languages.service';
import { LanguageDoc } from '../../display-interfaces';
import { ResponseStatus } from '@admin-tool-modules/global-modules-interfaces';
import * as properties from 'properties';

/**
 * Modal component for importing translations from a .properties file into a language document.
 * Reads the file using the FileReader API, parses it using the properties library,
 * and merges the translations into the language document via LanguagesService.
 * Controlled by the parent via the visible input.
 * Emits closed when the modal is dismissed and saved when the translations are imported successfully.
 */
@Component({
  selector: 'display-languages-upload',
  imports: [TranslatePipe],
  templateUrl: './display-languages-upload.component.html',
  styleUrl: './display-languages-upload.component.less'
})
export class DisplayLanguagesUploadComponent implements OnChanges{

  /** Controls visibility of the modal */
  @Input() visible = false;

  /** Language document to import translations into */
  @Input() doc: LanguageDoc | null = null;

  /** Reference to the file input element for resetting its value on modal open */
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  /** Emitted when the modal is dismissed without saving */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when the translations are imported successfully */
  @Output() saved = new EventEmitter<void>();
  
  /** File selected by the user from the file input */
  selectedFile: File | null = null;
  
  /** Controls visibility of the submitting state on the submit button */
  loadingModalState = false;

  /** Tracks the state of the import operation for error display in the footer */
  responseStatus: ResponseStatus = {};

  /** Validation error message for the file input */
  fileError: string | null = null;

  constructor(private languagesService: LanguagesService, private translate: TranslateService){}

  /**
   * Resets the modal state when it becomes visible.
   * Clears the selected file, loading state, response status, file error,
   * and the file input DOM value on every open.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.selectedFile = null;
      this.responseStatus = {};
      this.loadingModalState = false;
      this.fileError = null;
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
    }
  }

  /**
   * Captures the file selected by the user from the file input.
   * Clears any existing file validation error on selection.
   *
   * @param {Event} event - the change event from the file input
   */
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.fileError = null;
  }

  /**
   * Reads the content of a file as a UTF-8 string using the FileReader API.
   * Listens to loadend, error and abort events to resolve or reject the Promise.
   *
   * @param {File} file - the file to read
   * @returns {Promise<string>} the file content as a string
   */
  private readFile(file: File): Promise<string> {
    const fileContent = new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('loadend', () => resolve(reader.result as string));
      reader.addEventListener('error', () => reject(reader.error));
      reader.addEventListener('abort', () => reject(new Error('FileReader aborted.')));
      reader.readAsText(file);
    });
    return fileContent;
  }

  /**
   * Parses a .properties file content string into a key-value object.
   * Uses the properties library to handle escaping and encoding correctly.
   * Wraps the callback-based library in a Promise for async/await usage.
   *
   * @param {string} content - the raw string content of the .properties file
   * @returns {Promise<Record<string, string>>} the parsed translations
   */
  private parseProperties(content: string): Promise<Record<string, string>> {
    const parsed = new Promise<Record<string, string>>((resolve, reject) => {
      properties.parse(content, (err: any, obj: Record<string, string>) => {
        if (err) {
          return reject(err);
        }
        resolve(obj);
      });
    });
    return parsed;
  }

  /**
   * Validates the file input, reads and parses the selected .properties file,
   * and imports the translations into the language document via LanguagesService.
   * Shows a validation error if no file is selected.
   * Shows an error message in the footer if the import fails.
   *
   * @returns {Promise<void>}
   */
  async submit(): Promise<void> {
    this.fileError = null;
    if (!this.selectedFile) {
      this.fileError = this.translate.instant('field is required', {
        field: this.translate.instant('Translation file')
      });
      return;
    }

    this.loadingModalState = true;
    this.responseStatus = {};

    try {
      const content = await this.readFile(this.selectedFile);
      const translations = await this.parseProperties(content);
      await this.languagesService.importLanguage(this.doc!, translations);
      this.saved.emit();
      this.closed.emit();
    } catch (error) {
      console.error('Error importing translations', error);
      this.responseStatus = { state: 'error', msg: 'Error parsing file' };
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
