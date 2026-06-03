import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguagesService } from '@admin-tool-services/languages.service';
import { LanguageDoc, DisplayTranslationRow } from '../display-interfaces';
import { DisplayTranslationsEditComponent } from './display-translations-edit/display-translations-edit.component';
import { TRANSLATION_KEYS_CODE, TRANSLATION_KEYS_NAME, DEFAULT_LANGUAGE } from '../display-constans';

/**
 * Component for viewing and editing translation strings side-by-side across two languages.
 *
 * Loads all language documents from CouchDB on init and displays them in a two-column table.
 * The left dropdown includes a Translation Keys option that shows raw i18n keys instead of translated values.
 * Clicking any row opens the edit modal for that key.
 * The + Add Translation button opens the modal in add mode for creating a new key.
 *
 * Part of the Display module.
 */
@Component({
  selector: 'display-translations',
  imports: [FormsModule, TranslatePipe, DisplayTranslationsEditComponent],
  templateUrl: './display-translations.component.html',
  styleUrl: './display-translations.component.less'
})
export class DisplayTranslationsComponent implements OnInit {

  /** Controls visibility of the loader while language documents are being fetched */
  loadingPageStatus = false;

  /** Raw language documents fetched from CouchDB, kept in memory to avoid re-fetching on dropdown changes */
  docs: LanguageDoc[] = [];

  /** Options for the left dropdown — includes Translation Keys as first option followed by all languages */
  leftTranslationOptions: { code: string, name: string }[] = [];

  /** Options for the right dropdown — includes all languages without the Translation Keys option */
  rightTranslationOptions: { code: string, name: string }[] = [];

  /** Currently selected language code for the left column */
  leftCode = '';

  /** Currently selected language code for the right column */
  rightCode = '';

  /** Rows built from the selected left and right language documents for the side-by-side table */
  translationRows: DisplayTranslationRow[] = [];

  /** Controls visibility of the add/edit translation modal */
  showEditModal = false;

  /** Translation key to edit, or null when adding a new key */
  selectedKey: string | null = null;

  constructor(private languagesService: LanguagesService){}

  /**
   * Fetches all language documents on init, builds the dropdown options,
   * initialises the selected locale codes and builds the initial translation rows.
   */
  async ngOnInit(): Promise<void> {
    this.loadingPageStatus = true;

    try {
      this.docs = await this.languagesService.getLanguageDocs();
      const options = this.docs.map(doc => ({ code: doc.code, name: doc.name }));
      this.rightTranslationOptions = options;
      this.leftTranslationOptions = [
        { code: TRANSLATION_KEYS_CODE, name: TRANSLATION_KEYS_NAME },
        ...options
      ];
      this.initLocaleCodes();
      this.buildTranslationRows();
    } catch (error) {
      console.error('Error fetching translation documents', error);
    } finally {
      this.loadingPageStatus = false;
    }
  } 

  /**
   * Sets the initial locale codes for the dropdowns.
   * Left column defaults to English. Right column defaults to the first language that is not English,
   * or English if no other language exists.
   */
  private initLocaleCodes(): void {
    this.leftCode = DEFAULT_LANGUAGE;
    const right = this.rightTranslationOptions.find(translation => translation.code !== DEFAULT_LANGUAGE);
    this.rightCode = right?.code ?? DEFAULT_LANGUAGE;
  }
  
  /**
   * Builds the translation rows for the side-by-side table based on the currently selected
   * left and right locale codes.
   * When Translation Keys mode is active (leftCode === 'keys'), uses English as the base doc
   * and sets leftValue to the raw key instead of the translated value.
   * rightValue is undefined when the key does not exist in the right language document.
   */
  buildTranslationRows(): void {
    const showKeys = this.leftCode === TRANSLATION_KEYS_CODE;
    const leftDoc = this.docs.find(doc => doc.code === (showKeys ? DEFAULT_LANGUAGE : this.leftCode));
    const rightDoc = this.docs.find(doc => doc.code === this.rightCode);

    const leftValues = { ...leftDoc?.generic, ...leftDoc?.custom };
    const rightValues = { ...rightDoc?.generic, ...rightDoc?.custom };

    this.translationRows = Object.keys(leftValues).map(key => ({
      key,
      leftValue: showKeys ? key : leftValues[key],
      rightValue: rightValues[key],
    }));
  }

  /**
   * Rebuilds the translation rows when either dropdown value changes.
   * Does not re-fetch from CouchDB — uses the docs already in memory.
   */
  onDropdownChange(): void {
    this.buildTranslationRows();
  }

  /**
   * Opens the add/edit modal in add mode with an empty form.
   */
  addTranslation(): void {
    this.selectedKey = null;
    this.showEditModal = true;
  }

  /**
   * Opens the add/edit modal in edit mode with the selected key preloaded.
   *
   * @param {string} key - the translation key to edit
   */
  editTranslation(key: string): void {
    this.selectedKey = key;
    this.showEditModal = true;
  }  

}
