import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppFormsService } from '@admin-tool-services/app-forms.service';
import { ResourcesService } from '@admin-tool-services/resources.service';
import { FormDoc } from '@admin-tool-modules/forms/app-forms-interfaces';
import { ResourcesDoc } from '@admin-tool-modules/resources-interfaces';
import { ResponseStatus } from '@admin-tool-modules/global-modules-interfaces';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Component for managing XForm documents in the CHT instance.
 *
 * Loads all form documents and the resources document on init and displays
 * them in a table showing the icon, unique ID and title of each form.
 * Allows administrators to upload new XForm XML files along with their
 * JSON metadata to install or update forms available to field users.
 *
 * Part of the App Forms module.
 */
@Component({
  selector: 'app-forms',
  imports: [TranslatePipe],
  templateUrl: './app-forms.component.html',
  styleUrl: './app-forms.component.less'
})
export class AppFormsComponent implements OnInit {

  /** Reference to the XML file input element for reading the selected file and resetting after upload */
  @ViewChild('xmlFile') xmlFileRef!: ElementRef<HTMLInputElement>;

  /** Reference to the JSON meta file input element for reading the selected file and resetting after upload */
  @ViewChild('metaFile') metaFileRef!: ElementRef<HTMLInputElement>;

  /** List of form documents fetched from CouchDB for template iteration */
  forms: FormDoc[] = [];

  /** Resources document containing icon attachments, used to resolve form icons */
  resourcesDoc: ResourcesDoc | null = null;

  /** Controls visibility of the loader while forms and resources are being fetched */
  loadingPageStatus = false;

  /** Tracks the state of the upload operation for loading and error feedback */
  responseStatus: ResponseStatus = {};

  constructor(
    private appFormsService: AppFormsService,
    private resourcesService: ResourcesService,
    private sanitizer: DomSanitizer
  ) {}

  /**
   * Fetches all form documents and the resources document on init.
   */
  async ngOnInit() {
    this.loadingPageStatus = true;
    try {
      this.forms = await this.appFormsService.getForms();
      this.resourcesDoc = await this.resourcesService.getResources();
    } catch (error) {
      console.error('Error fetching XForms for form config page.', error);
    } finally {
      this.loadingPageStatus = false;
    }
  }

  /**
   * Resolves the icon for a form document using the resources document.
   * Returns empty content if the resources document has not loaded yet
   * or if the icon name is empty.
   *
   * @param {string} iconName - the icon name as stored in the form document
   * @returns {{ isSvg: boolean; content: string }}
   */
  getFormIcon(iconName: string): { isSvg: boolean; content: string | SafeHtml } {
    if (!this.resourcesDoc || !iconName) {
      return { isSvg: false, content: '' };
    }
    const result = this.resourcesService.getIconContent(iconName, this.resourcesDoc);
    if (result.isSvg) {
      return {
        isSvg: true,
        content: this.sanitizer.bypassSecurityTrustHtml(result.content)
      };
    }
    return result;
  }

  /**
   * Reloads the list of form documents from CouchDB without triggering the full page loader.
   * Called after a successful upload to reflect the newly added or updated form in the table.
   *
   * @returns {Promise<void>}
   */
  private async reloadForms(): Promise<void> {
    try {
      this.forms = await this.appFormsService.getForms();
    } catch (error) {
      console.error('Error fetching XForms for form config page.', error);
    }
  }

  /**
   * Handles the XForm upload process.
   * Validates that both files are present before proceeding.
   * Sets responseStatus to loading during the upload and clears it on success.
   * Reloads the forms table after a successful upload.
   * Sets responseStatus to error with the server message if the upload fails.
   *
   * @returns {Promise<void>}
   */
  async upload(): Promise<void> {
    const xmlFile = this.xmlFileRef.nativeElement.files?.[0];
    const metaFile = this.metaFileRef.nativeElement.files?.[0];

    if (!xmlFile && !metaFile) {
      this.responseStatus = { state: 'error', msg: 'Upload failed: XML and JSON meta files not found' };
      return;
    }
    if (!xmlFile) {
      this.responseStatus = { state: 'error', msg: 'Upload failed: XML file not found' };
      return;
    }
    if (!metaFile) {
      this.responseStatus = { state: 'error', msg: 'Upload failed: JSON meta file not found' };
      return;
    }

    this.responseStatus = { state: 'loading' };

    try {
      await this.appFormsService.uploadForm(xmlFile, metaFile);
      this.xmlFileRef.nativeElement.value = '';
      this.metaFileRef.nativeElement.value = '';
      await this.reloadForms();
      this.responseStatus = {};
    } catch (error) {
      console.error('Upload failed', error);
      this.responseStatus = { state: 'error', msg: 'Upload failed: ' + error.message };
    }
  }
}
