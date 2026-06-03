import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguagesService } from '@admin-tool-services/languages.service';
import { 
  PrivacyPolicyRow, 
  PrivacyPoliciesDoc, 
  LanguageDoc, 
  PrivacyPolicyAttachment 
} from '../display-interfaces';
import { ResponseStatus } from '@admin-tool-modules/global-modules-interfaces';
import { DecimalPipe } from '@angular/common';
import { 
  DisplayPrivacyPoliciesPreviewComponent 
} from './display-privacy-policies-preview/display-privacy-policies-preview.component';

/**
 * Component for managing privacy policy HTML documents for each application language.
 * Loads all available languages and their corresponding privacy policies from CouchDB on init.
 * Displays a table with one row per language showing the current policy and an upload area.
 * Allows the administrator to stage new HTML files, delete existing policies,
 * and save all changes in a single submit operation.
 */
@Component({
  selector: 'display-privacy-policies',
  imports: [FormsModule, TranslatePipe, DecimalPipe, DisplayPrivacyPoliciesPreviewComponent],
  templateUrl: './display-privacy-policies.component.html',
  styleUrl: './display-privacy-policies.component.less'
})
export class DisplayPrivacyPoliciesComponent implements OnInit {

  /** List of rows for the privacy policies table, one per available application language */
  privacyPolicyRows: PrivacyPolicyRow[] = [];

  /** Controls visibility of the loader while languages and policies are being fetched */
  loadingPageStatus = false;

  /** Tracks the state of the submit operation for loading, success and error feedback */
  responseStatus: ResponseStatus = {};

  /** The privacy-policies document loaded from CouchDB, used during submit to build the updated doc */
  privacyPoliciesDoc: PrivacyPoliciesDoc | null = null;

  /** Language codes whose current policies are pending deletion on the next submit */
  languagePolicyDeletes: string[] = [];

  /** Controls visibility of the preview modal */
  showPreviewModal = false;

  /** Saved attachment to preview, null if previewing a staged file */
  previewAttachment: PrivacyPolicyAttachment | null = null;

  /** Staged file to preview, null if previewing a saved attachment */
  previewStagedFile: File | null = null;

  /** Name of the language whose policy is being previewed */
  previewLanguageName: string = '';

  constructor(private languagesService: LanguagesService) {}

  /**
   * Loads all language documents and the privacy-policies document from CouchDB on init.
   * Builds the privacyPolicyRows array combining each language with its corresponding attachment.
   * Sets attachment to null for languages that do not have a policy saved yet.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit(): Promise<void> {
    this.loadingPageStatus = true;
    try {
      const languageDocs = await this.languagesService.getLanguageDocs();
      const privacyPoliciesDoc = await this.languagesService.getPrivacyPoliciesDoc(true)
        .catch(error => {
          console.error('Error loading privacy policies', error);
          return { _id: 'privacy-policies', privacy_policies: {}, _attachments: {} } as PrivacyPoliciesDoc;
        });

      this.privacyPoliciesDoc = privacyPoliciesDoc;
      this.privacyPolicyRows = this.buildPrivacyPolicyRows(languageDocs, privacyPoliciesDoc);
    } catch (error) {
      console.error('Error loading languages', error);
    } finally {
      this.loadingPageStatus = false;
    }
  }

  /**
   * Calculates the byte size of an attachment's data field.
   * For base64 strings (saved attachments), returns the string length.
   * For File objects (staged files), returns the file size in bytes.
   *
   * @param {string | File} data - the attachment data, either a base64 string or a File object
   * @returns {number} the size in bytes
   */
  getAttachmentSize(data: string | File): number {
    return typeof data === 'string' ? data.length : (data as File).size;
  }

  /**
   * Builds the privacy policy rows for the table by combining each language document
   * with its corresponding attachment from the privacy-policies CouchDB document.
   * Sets attachment to null for languages that do not have a policy saved yet.
   *
   * @param {LanguageDoc[]} languageDocs - all available language documents
   * @param {PrivacyPoliciesDoc} privacyPoliciesDoc - the privacy-policies document from CouchDB
   * @returns {PrivacyPolicyRow[]} one row per language with attachment and stagedFile initialized
   */
  private buildPrivacyPolicyRows(
    languageDocs: LanguageDoc[], 
    privacyPoliciesDoc: PrivacyPoliciesDoc
  ): PrivacyPolicyRow[] {
    const attachments = privacyPoliciesDoc._attachments || {};
    const policies = privacyPoliciesDoc.privacy_policies || {};
    
    return languageDocs.map(doc => {
      const attachmentName = policies[doc.code];
      const attachment = attachmentName ? attachments[attachmentName] ?? null : null;
      return {
        code: doc.code,
        name: doc.name,
        attachment,
        stagedFile: null
      };
    });
  }

  /**
   * Captures the file selected by the user from the file input and stages it in the corresponding row.
   * Does not save to CouchDB — the file is stored in stagedFile until submit is called.
   *
   * @param {string} code - the language code of the row whose file input changed
   * @param {Event} event - the change event from the file input
   */
  onFileSelected(code: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const row = this.privacyPolicyRows.find(privacyPolicyRow => privacyPolicyRow.code === code);
    if (row) {
      row.stagedFile = file;
    }
  }

  /**
   * Marks the current saved policy for a language as pending deletion.
   * Clears the attachment from the row so it disappears from the UI immediately.
   * The actual deletion from CouchDB occurs when submit is called.
   *
   * @param {string} code - the language code of the policy to delete
   */
  deletePolicy(code: string): void {
    const row = this.privacyPolicyRows.find(privacyPolicyRow => privacyPolicyRow.code === code);
    if (row) {
      row.attachment = null;
      this.languagePolicyDeletes.push(code);
    }
  }

  /**
   * Cancels a staged file upload for a language by clearing its stagedFile.
   * Does not affect any saved policy — only removes the pending upload from the UI.
   *
   * @param {string} code - the language code of the row whose staged file should be cleared
   */
  deleteUpdate(code: string): void {
    const row = this.privacyPolicyRows.find(privacyPolicyRow => privacyPolicyRow.code === code);
    if (row) {
      row.stagedFile = null;
    }
  }

  /**
   * Applies all pending deletions to the privacy-policies document before saving.
   * For each language code in languagePolicyDeletes, removes the entry from
   * privacy_policies and its corresponding attachment from _attachments.
   *
   * @param {PrivacyPoliciesDoc} doc - the fresh privacy-policies document to mutate
   */
  private processDeletes(doc: PrivacyPoliciesDoc): void {
    doc.privacy_policies = doc.privacy_policies || {};
    doc._attachments = doc._attachments || {};

    this.languagePolicyDeletes.forEach(code => {
      const attachmentName = doc.privacy_policies[code];
      delete doc.privacy_policies[code];
      delete doc._attachments[attachmentName];
    });
  }

  /**
   * Applies all staged file uploads to the privacy-policies document before saving.
   * For each row with a valid staged file, removes the old attachment if one existed,
   * then adds the new file as an attachment with content_type and data set to the File object.
   * PouchDB handles reading the File and encoding it when the document is put to CouchDB.
   *
   * @param {PrivacyPoliciesDoc} doc - the fresh privacy-policies document to mutate
   * @param {PrivacyPolicyRow[]} rows - rows with staged files filtered to text/html only
   */
  private processUpdates(doc: PrivacyPoliciesDoc, rows: PrivacyPolicyRow[]): void {
    doc.privacy_policies = doc.privacy_policies || {};
    doc._attachments = doc._attachments || {};

    rows.forEach(row => {
      const oldAttachmentName = doc.privacy_policies[row.code];
      delete doc._attachments[oldAttachmentName];
      doc.privacy_policies[row.code] = row.stagedFile!.name;
      doc._attachments[row.stagedFile!.name] = {
        content_type: row.stagedFile!.type,
        data: row.stagedFile!,
      };
    });
  }

  /**
   * Saves all pending changes (deletes and uploads) to the privacy-policies document in CouchDB.
   * Fetches a fresh copy of the document to get the latest _rev before applying changes.
   * Only processes staged files with content_type text/html.
   * Shows a no-changes message if there is nothing to save.
   * Reloads the component on success to reflect the updated state.
   * Shows a success message that clears automatically after 3 seconds.
   *
   * @returns {Promise<void>}
   */
  async submit(): Promise<void> {
    this.responseStatus = { state: 'loading' };

    const rowsWithStagedFiles = this.privacyPolicyRows.filter(
      row => row.stagedFile !== null && row.stagedFile.type === 'text/html'
    );

    if (!rowsWithStagedFiles.length && !this.languagePolicyDeletes.length) {
      this.responseStatus = { state: 'success', msg: 'display.privacy.policies.no.changes' };
      return;
    }

    try {
      const freshDoc = await this.languagesService.getPrivacyPoliciesDoc();

      this.processDeletes(freshDoc);
      this.processUpdates(freshDoc, rowsWithStagedFiles);

      await this.languagesService.savePrivacyPolicies(freshDoc);
      await this.ngOnInit();
      this.responseStatus = { state: 'success', msg: 'display.privacy.policies.submit.success' };
    } catch (error) {
      console.error('Error while uploading privacy policies', error);
      this.responseStatus = { state: 'error', msg: 'display.privacy.policies.failure' };
    }
  }

  /**
   * Opens the preview modal for a saved attachment from CouchDB.
   * Sets the attachment as the preview source and clears any staged file.
   *
   * @param {PrivacyPolicyAttachment} attachment - the saved attachment to preview
   * @param {string} name - the display name of the language whose policy is being previewed
   */
  openAttachmentPreview(attachment: PrivacyPolicyAttachment, name: string): void {
    this.previewAttachment = attachment;
    this.previewStagedFile = null;
    this.previewLanguageName = name;
    this.showPreviewModal = true;
  }

  /**
   * Opens the preview modal for a staged file selected by the user.
   * Sets the staged file as the preview source and clears any saved attachment.
   *
   * @param {File} file - the staged file to preview
   * @param {string} name - the display name of the language whose policy is being previewed
   */
  openStagedFilePreview(file: File, name: string): void {
    this.previewStagedFile = file;
    this.previewAttachment = null;
    this.previewLanguageName = name;
    this.showPreviewModal = true;
  }

}
