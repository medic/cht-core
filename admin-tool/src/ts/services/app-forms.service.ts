import { Injectable } from '@angular/core';
import { DbService } from '@admin-tool-services/db.service';
import { FormDoc } from '@admin-tool-modules/forms/app-forms-interfaces';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Service responsible for reading and uploading XForm documents stored in CouchDB.
 * Form documents are identified by type 'form' and have IDs prefixed with 'form:'.
 * Reads are done via DbService using the medic-client/doc_by_type view.
 * Uploads validate the XML against the CHT API before saving to CouchDB.
 */
@Injectable({
  providedIn: 'root'
})
export class AppFormsService {

  constructor(private db: DbService, private http: HttpClient) { }

  /**
   * Fetches all form documents from CouchDB via the medic-client/doc_by_type view.
   * Returns the full document for each form ordered as returned by CouchDB.
   *
   * @returns {Promise<FormDoc[]>}
   */
  async getForms(): Promise<FormDoc[]> {
    const result = await this.db.get().query('medic-client/doc_by_type', {
      include_docs: true,
      key: ['form']
    });

    return result.rows.map((row) => row.doc as FormDoc);
  }
  
  /**
   * Extracts the title from an XForm XML string.
   * First attempts to find the title node using DOMParser.
   * Falls back to a regex match on the raw string if the namespace-aware query fails.
   *
   * @param {string} xml - the raw XForm XML string
   * @returns {string} the form title, or an empty string if not found
   */
  getXmlTitle(xml: string): string {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    let title = doc.querySelector('title')?.textContent ?? '';
    if (!title) {
      const match = xml.match(/<h:title[^>]*>([^<]*)<\/h:title>/);
      if (match) {
        title = match[1];
      }
    }
    return title;
  }

  /**
   * Extracts the internalId from an XForm XML string.
   * Parses the XML and navigates to the first child of the <instance> element.
   * Validates that the data node contains <meta><instanceID/></meta> as required by the XForms standard.
   * Validates that the data node has an id attribute.
   * If meta.internalId is defined and does not match the id attribute, throws an error.
   *
   * @param {string} xml - the raw XForm XML string
   * @param {Record<string, any>} meta - the parsed JSON meta file
   * @returns {string} the form internalId
   * @throws {Error} if the instanceID node is missing, the id attribute is missing,
   * or meta.internalId conflicts with the id attribute
   */
  getXmlFormId(xml: string, meta: Record<string, any>): string {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const instance = doc.querySelector('instance');
    const dataNode = instance?.children[0];

    if (!dataNode?.querySelector('meta > instanceID')) {
      throw new Error('No <meta><instanceID/></meta> node found for first child of <instance> element.');
    }

    const formId = dataNode.getAttribute('id');

    if (!formId) {
      throw new Error('No ID attribute found for first child of <instance> element.');
    }

    if (meta.internalId && meta.internalId !== formId) {
      throw new Error(
        'The internalId property in the meta file will be overwritten by the ID attribute on the first child ' +
        'of <instance> element in the XML. Remove this property from the meta file and try again.'
      );
    }

    return formId;
  }

  /**
   * Calculates the SHA-256 hash of an XForm XML string.
   * Encodes the string as UTF-8 bytes before hashing.
   * Returns the hash as a lowercase hexadecimal string.
   *
   * @param {string} xml - the raw XForm XML string
   * @returns {Promise<string>} the SHA-256 hash as a hex string
   */
  async getXmlHash(xml: string): Promise<string> {
    const utf8 = new TextEncoder().encode(xml);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validates an XForm XML string against the CHT API.
   * POSTs the raw XML to /api/v1/forms/validate with Content-Type application/xml.
   * Throws an error with the server message if validation fails.
   *
   * @param {string} xml - the raw XForm XML string to validate
   * @returns {Promise<void>}
   * @throws {Error} with the server error message if the API rejects the XML
   */
  async validateXml(xml: string): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/v1/forms/validate', xml, {
        headers: { 'Content-Type': 'application/xml' },
      })
    ).catch(err => {
      const errorMsg = err.error?.error ?? String(err);
      throw new Error('Error validating form - ' + errorMsg);
    });
  }

  /**
   * Builds the CouchDB document for an XForm upload.
   * Fetches the existing document with attachments to preserve form.html and model.xml if present.
   * Creates a new document if none exists.
   * Applies the meta file properties via Object.assign, then forces type and internalId.
   * Adds the XML as an attachment and calculates the xmlVersion hash.
   *
   * @param {string} xml - the raw XForm XML string
   * @param {Record<string, any>} meta - the parsed JSON meta file
   * @returns {Promise<FormDoc>} the complete document ready to PUT to CouchDB
   */
  async createDoc(xml: string, meta: Record<string, any>): Promise<FormDoc>{
    const title = this.getXmlTitle(xml);
    const internalId = this.getXmlFormId(xml, meta);
    const couchId = 'form:' + internalId;
    
    const doc: FormDoc = await this.db.get().get(couchId, {attachments: true})
      .catch((err) => {
        if (err.status === 404) {
          return { _id: couchId};
        }
        throw err;
      });

    doc.title = title;
    Object.assign(doc, meta);
    doc.type = 'form';
    doc.internalId = internalId;
    
    doc._attachments = doc._attachments || {};
    doc._attachments['xml'] = {
      content_type: 'application/xml',
      data: new Blob([xml], {type: 'application/xml'}) as any,
    };
    
    const hash = await this.getXmlHash(xml);
    doc.xmlVersion = {
      time: Date.now(),
      sha256: hash
    };
    
    return doc;
  }

  /**
   * Reads a File object as a UTF-8 string using the FileReader API.
   * Listens to loadend, error and abort events to resolve or reject the Promise.
   *
   * @param {File} file - the file to read
   * @returns {Promise<string>} the file content as a string
   */
  private readFile(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('loadend', () => resolve(reader.result as string));
      reader.addEventListener('error', () => reject(reader.error));
      reader.addEventListener('abort', () => reject(new Error('FileReader aborted.')));
      reader.readAsText(file);
    });
  }

  /**
   * Orchestrates the full XForm upload process.
   * Reads both files, parses the JSON meta, validates the XML against the API,
   * builds the CouchDB document and saves it via DbService.
   *
   * @param {File} xmlFile - the XForm XML file to upload
   * @param {File} metaFile - the JSON meta file containing icon, context and other properties
   * @returns {Promise<void>}
   * @throws {Error} if validation fails, the meta is not valid JSON, or the database write fails
   */
  async uploadForm(xmlFile: File, metaFile: File): Promise<void> {
    const xml = await this.readFile(xmlFile);
    const metaContent = await this.readFile(metaFile);
    const meta = JSON.parse(metaContent);

    await this.validateXml(xml);
    const doc = await this.createDoc(xml, meta);
    await this.db.get().put(doc);
  }
}
