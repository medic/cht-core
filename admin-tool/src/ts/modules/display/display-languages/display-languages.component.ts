import { LanguagesService } from '@admin-tool-services/languages.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { LanguageDoc, LanguageModel } from '../display-interfaces';
import { ResponseStatus } from '@admin-tool-modules/global-modules-interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { DisplayLanguagesEditComponent } from './display-languages-edit/display-languages-edit.component';
import { DisplayLanguagesDeleteComponent } from './display-languages-delete/display-languages-delete.component';
import { DisplayLanguagesUploadComponent } from './display-languages-upload/display-languages-upload.component';
import * as properties from 'properties';
import { SettingsService, LanguageSettings } from '@admin-tool-services/settings.service';
import { FormsModule } from '@angular/forms';
import { ChangesService } from '@admin-tool-services/changes.service';
import { DOC_IDS } from '@medic/constants';

/**
 * Component for managing language documents and language settings in the CHT instance.
 *
 * Loads all language documents from CouchDB and the current language settings on init.
 * Displays a form to configure the default application language and the language for
 * outgoing messages, and an accordion list of all available languages.
 * Each language panel shows the name, missing translation count, star icons indicating
 * if it is the default or outgoing language, and actions: Edit, Enable/Disable,
 * Download, Upload and Delete.
 *
 */
@Component({
  selector: 'display-languages',
  imports: [
    TranslatePipe, 
    FormsModule,
    DisplayLanguagesEditComponent, 
    DisplayLanguagesDeleteComponent, 
    DisplayLanguagesUploadComponent
  ],
  templateUrl: './display-languages.component.html',
  styleUrl: './display-languages.component.less'
})
export class DisplayLanguagesComponent implements OnInit, OnDestroy{

  /** List of language models for template iteration */
  languages: LanguageModel[] = [];

  /** Controls visibility of the loader while languages are being fetched */
  loadingPageStatus = false;

  /** Tracks the state of save/edit/delete operations */
  responseStatus: ResponseStatus = {};

  /** Controls visibility of the add/edit language modal */
  showEditModal = false;

  /** Language document to edit, delete, upload, or null when adding a new language */
  selectedDoc: LanguageDoc | null = null;

  /** Controls visibility of the delete confirmation modal */
  showDeleteModal = false;

  /** Controls visibility of the upload modal */
  showUploadModal = false;

  /** Currently selected default application language code */
  localeLanguage = '';

  /** Currently selected language code for outgoing messages */
  localeOutgoingLanguage = '';

  /** Default application language code saved in settings, used to display star icons in the accordion */
  savedLocaleLanguage = '';

  /** Outgoing message language code saved in settings, used to display star icons in the accordion */
  savedLocaleOutgoingLanguage = '';
  
  /** Error message shown when the initial page load fails */
  loadingError: string | null = null;

  /** Error for the language that failed to enable/disable, contains the code and message */
  languageError: { code: string, message: string } | null = null;

  /** Language code to expand in the accordion after a reload */
  expandedLanguageCode: string | null = null;

  /** Subscription to CouchDB changes feed, cleaned up on destroy */
  private changesSubscription: { unsubscribe: () => void } | null = null;

  constructor(
    private languageService: LanguagesService, 
    private settingsService: SettingsService, 
    private changesService: ChangesService
  ){}

  /**
   * Fetches all language documents and language settings on init.
   * Builds the UI model for the accordion and preloads the locale
   * and locale_outgoing values for the language settings form.
   */
  async ngOnInit(): Promise<void> {
    this.loadingPageStatus = true;
    
    try {
      this.languages = await this.languageService.getLanguages();
      const languageSettings: LanguageSettings = await this.settingsService.getLanguageSettings();
      this.localeLanguage = languageSettings.locale;
      this.localeOutgoingLanguage = languageSettings.localeOutgoing;
      this.savedLocaleLanguage = languageSettings.locale;
      this.savedLocaleOutgoingLanguage = languageSettings.localeOutgoing;

      this.changesSubscription = this.changesService.subscribe({
        key: 'display-languages',
        filter: change => change.id.startsWith('messages-') || change.id === DOC_IDS.SETTINGS,
        callback: () => this.ngOnInit()
      });
    } catch (error) {
      console.error('Error fetching languages', error);
      this.loadingError = 'Error fetching languages';
    } finally {
      this.loadingPageStatus = false;
    }
  }
  
  ngOnDestroy(): void {
    this.changesSubscription?.unsubscribe();
  }

  /**
   * Saves the selected default application language and outgoing message language
   * via SettingsService.
   * Shows a loader during the operation and displays success or error feedback.
   * The success message clears automatically after 3 seconds.
   */
  async submitLanguageSettings(): Promise<void> {
    this.responseStatus = { state: 'loading'};
    
    try {
      await this.settingsService.updateLanguageSettings({
        locale: this.localeLanguage,
        localeOutgoing: this.localeOutgoingLanguage
      });
      this.savedLocaleLanguage = this.localeLanguage;
      this.savedLocaleOutgoingLanguage = this.localeOutgoingLanguage;
      this.responseStatus = { state: 'success', msg: 'Saved'};

    } catch (error) {
      console.error('Error updating language settings', error);
      this.responseStatus = { state: 'error', msg: 'Error saving language settings'};
    }
  }

  /**
   * Disables a language by updating its enabled state in settings.languages.
   * Sets expandedLanguageCode so the accordion reopens for this language after the changes feed reloads the list.
   *
   * @param {LanguageDoc} doc - the language document to disable
   */
  async disableLanguage(doc: LanguageDoc): Promise<void> {
    try {
      await this.languageService.disableLanguage(doc);
      this.expandedLanguageCode = doc.code;
    } catch (error) {
      console.error('Error disabling language', error);
      this.languageError = { code: doc.code, message: 'Error disabling language' };
    }
  }

  /**
   * Enables a language by updating its enabled state in settings.languages.
   * Sets expandedLanguageCode so the accordion reopens for this language after the changes feed reloads the list.
   *
   * @param {LanguageDoc} doc - the language document to enable
   */
  async enableLanguage(doc: LanguageDoc): Promise<void> {
    try {
      await this.languageService.enableLanguage(doc);
      this.expandedLanguageCode = doc.code;
    } catch (error) {
      console.error('Error enabling language', error);
      this.languageError = { code: doc.code, message: 'Error enabling language' };
    }
  }


  /**
   * Opens the edit modal with the selected language document.
   * Sets expandedLanguageCode so the accordion reopens for this language after the modal saves.
   *
   * @param {LanguageDoc} doc - the language document to edit
   */
  async editLanguage(doc: LanguageDoc): Promise<void> {
    this.selectedDoc = doc;
    this.expandedLanguageCode = doc.code;
    this.showEditModal = true;
  }

  /**
   * Opens the upload modal with the selected language document.
   * Sets expandedLanguageCode so the accordion reopens for this language after the modal saves.
   *
   * @param {LanguageDoc} doc - the language document to import translations into
   */
  async uploadLanguage(doc: LanguageDoc): Promise<void> {
    this.selectedDoc = doc;
    this.expandedLanguageCode = doc.code;
    this.showUploadModal = true;
  }

  /**
   * Opens the delete confirmation modal with the selected language document.
   *
   * @param {LanguageDoc} doc - the language document to delete
   */
  async deleteLanguage(doc: LanguageDoc): Promise<void> {
    this.selectedDoc = doc;
    this.showDeleteModal = true;
  }

  /**
   * Opens the edit modal in add mode with an empty form.
   */
  async addLanguage(): Promise<void> {
    this.selectedDoc = null;
    this.showEditModal = true;
  }

  /**
   * Generates a .properties file from the language document's generic and custom
   * translations and triggers a browser download.
   * Custom translations override generic ones when keys conflict.
   * Does nothing if the document has no translations.
   *
   * @param {LanguageDoc} doc - the language document to export
   */
  downloadLanguage(doc: LanguageDoc): void {
    const values = { ...doc.generic, ...doc.custom };
    if (!Object.keys(values).length) {
      return;
    }
    const stringifier = properties.createStringifier();

    Object.keys(values).forEach(key => {
      stringifier.property({ key, value: values[key] });
    });

    const content = properties.stringify(stringifier);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = (window.URL || (window as any).webkitURL).createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc._id}.properties`;
    a.click();
    setTimeout(() => {
      (window.URL || (window as any).webkitURL).revokeObjectURL(url);
    }, 100);
  }
}
