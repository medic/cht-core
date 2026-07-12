import { Injectable, NgZone } from '@angular/core';
import type JQuery from 'jquery';
import events from 'enketo-core/src/js/event';
import { DOC_TYPES } from '@medic/constants';
import { v7 as uuid } from 'uuid';
import { Xpath } from '@mm-providers/xpath-element-path.provider';
import * as FileManager from '../../js/enketo/file-manager';

@Injectable({
  providedIn: 'root'
})
export class NewEnketoService {
  constructor(
    private readonly ngZone: NgZone
  ) { }

  public async validate(form: Record<string, any>) {
    const valid = await form.validate();
    if (!valid) {
      throw new Error('Form is invalid');
    }
    form.view.html.dispatchEvent(events.BeforeSave());
  }

  public getEnketoDoc(form: Record<string, any>, docId: string) {
    const formString = form.getDataStr({ irrelevant: false });
    const formDoc = new DOMParser().parseFromString(formString, 'text/xml');
    return new EnketoRootDoc(formDoc, docId);
  }

  async saveContact() {

  }

  // TODO Make sure extractLineageService.extract is called on given contact.
  async saveReport(config: FormConfig, form: Record<string, any>, defaultData: Record<string, any> = {}) {
    return this.ngZone.runOutsideAngular(async () => {
      await this.validate(form);
      const reportDoc: Record<string, any> = this.getReportDoc(config.doc.internalId, defaultData);
      const formDocData = this.getEnketoDoc(form, reportDoc._id);

      const subDocs = formDocData.getDbDocs();

      this.populateDbDocRefElements(formDocData, [formDocData, ...subDocs]);
      const binaryAttachments = this.populateBinaryAttachmentElements(formDocData, config.doc.internalId);
      const fileAttachments = FileManager
        .getCurrentFiles()
        .reduce((acc, file) => acc[`user-file-${file.name}`] = {
          content_type: file.type,
          data: new Blob([ file ], { type: file.type })
        }, {});

      const rootOutputDoc = {
        ...reportDoc,
        form_version: config.doc.xmlVersion,
        hidden_fields: [
          ...config.getHiddenFields(),
          ...subDocs.map(({ rootElement }) => rootElement.tagName)
        ],
        fields: formDocData.getCouchDoc(config),
        _attachments: {
          ...reportDoc._attachments,
          ...fileAttachments,
          ...binaryAttachments
        }
      };
      const dbDocObjects = subDocs.map(docData => docData.getCouchDoc(config));
      return [rootOutputDoc, ...dbDocObjects];
    });
  }

  private getReportDoc(form: string, defaultData: Record<string, any>) {
    if (defaultData._id) {
      return { ...defaultData };
    }
    return {
      _id: uuid(),
      form,
      type: DOC_TYPES.DATA_RECORD,
      content_type: 'xml',
      reported_date: Date.now(),
      from: defaultData.contact?.phone,
      ...defaultData
    };
  }

  private populateDbDocRefElements(rootDoc: EnketoRootDoc, allDocs: EnketoDoc[]) {
    rootDoc.dbDocRefElements.forEach(element => {
      const $element = $(element);
      const reference = $element.attr('db-doc-ref');
      const referencedNode = rootDoc.getNodeByXpath(element, reference);
      if (!referencedNode) {
        return;
      }
      const refDoc = allDocs.find(({ rootElement }) => rootElement === referencedNode);
      if (refDoc) {
        $element.text(refDoc.id);
      }
    });
  }

  private populateBinaryAttachmentElements(rootDocData: EnketoRootDoc, form: string) {
    return rootDocData.binaryTypeElements
      .filter(({ textContent }) => textContent)
      .map(element => {
        const xpath = Xpath.getElementTreeXPath(element);
        const formXpath = xpath.replace(/^\/[^/]+/, `/${form}`);
        const filename = `user-file${formXpath}`;
        const data = element.textContent;
        element.textContent = '';
        return { filename, data };
      })
      .reduce((acc, { filename, data }) => acc[filename] = { data, content_type: 'image/png' }, {});
  }
}

// TODO Should return direct from xml-forms.service...
export class FormConfig {
  private readonly modelDoc: XMLDocument;
  public readonly repeatPaths: string[];

  constructor(
    public readonly doc: Record<string, any>,
    html: string,
    xml: string,
    model: string
  ){
    const domParser = new DOMParser();
    this.modelDoc = domParser.parseFromString(model, 'text/xml');
    const xmlDoc = domParser.parseFromString(xml, 'text/xml');
    this.repeatPaths = Array
      .from(xmlDoc.querySelectorAll('repeat[nodeset]'))
      .map(el => el.getAttribute('nodeset')!)
      .filter(Boolean);
  }

  public getHiddenFields(modelNode = this.modelDoc.firstChild, prefix = '', current = new Set<string>()) {
    if (!modelNode) {
      return current;
    }
    this
      .getChildElements(modelNode)
      .forEach(node => {
        const path = `${prefix}${node.nodeName}`;
        const attr = node.attributes.getNamedItem('tag');
        if (attr?.value?.toLowerCase() === 'hidden') {
          current.add(path);
        } else {
          this.getHiddenFields(node, `${path}.`, current);
        }
      });
    return current;
  }

  // TODO duplicated
  private isElementNode(node: unknown): node is Element {
    return node?.['nodeType'] === Node.ELEMENT_NODE;
  }

  private getChildElements(node: Node) {
    return Array
      .from(node.childNodes)
      .filter(this.isElementNode);
  }
}

class EnketoDoc {
  protected readonly $rootElement: JQuery<Element>;

  constructor(
    public readonly rootElement: Element,
    public readonly id: string,
  ) {
    this.$rootElement = $(rootElement);
  }

  public getCouchDoc(formConfig: FormConfig): Record<string, any> {
    const path = Xpath.getElementTreeXPath(this.rootElement);
    return {
      ...this.nodesToJs(this.getChildElements(this.rootElement), formConfig.repeatPaths, path),
      _id: this.id,
      reported_data: Date.now()
    };
  }

  protected isElementNode(node: unknown): node is Element {
    return node?.['nodeType'] === Node.ELEMENT_NODE;
  }

  protected getChildElements(node: Node) {
    return Array
      .from(node.childNodes)
      .filter(this.isElementNode);
  }

  // TODO Any methods not using actual state could maybe be moved to helper.
  protected nodesToJs(nodes: Element[], repeatPaths: string[], path: string) {
    return nodes
      .reduce<Record<string, any>>((result, node) => {
        const nodePath = `${path}/${node.nodeName}`;
        const value = this.getJsValueForNode(node, repeatPaths, nodePath);
        if (repeatPaths.includes(nodePath)) {
          (result[node.nodeName] ??= []).push(value);
        } else {
          result[node.nodeName] = value;
        }
        return result;
      }, {});
  }

  private getJsValueForNode(node: Element, repeatPaths: string[], nodePath: string) {
    const elements = Array
      .from(node.childNodes)
      .filter(this.isElementNode);
    if (elements.length) {
      return this.nodesToJs(elements, repeatPaths, nodePath);
    }
    return node.textContent;
  }
}

// TODO Consider making this a ReportDoc and nesting all the dbDoc data stuff inside.
class EnketoRootDoc extends EnketoDoc {
  private readonly dbDocElements: Element[];
  public readonly dbDocRefElements: Element[];
  public readonly binaryTypeElements: Element[];

  constructor(
    private readonly xmlDoc: XMLDocument,
    id: string,
  ) {
    super(xmlDoc.documentElement, id);
    this. dbDocElements = this.$rootElement
      .find('[db-doc=true]')
      .get();
    this.dbDocRefElements = this.$rootElement
      .find('[db-doc-ref]')
      .get();
    this.binaryTypeElements = this.$rootElement
      .find('[type=binary]')
      .get();
  }

  public getDbDocs() {
    const getDbDocId = (e: Element) => $(e).children('_id').text() || uuid();
    return this.dbDocElements.map(dbDoc => new EnketoDoc(
      dbDoc,
      getDbDocId(dbDoc),
    ));
  }

  public getNodeByXpath(contextNode: Node, rawXpath?: string): Node | null {
    const xpath = rawXpath?.trim();
    if (!xpath) {
      return null;
    }
    const xpathSegments = xpath
      .trim()
      .split('/')
      .filter(Boolean);
    const contextLineage = this.getNodeWithLineage(contextNode);

    // Number of leading segments the target path shares with the context node's lineage.
    const firstDivergence = xpathSegments
      .findIndex((segment, i) => segment !== contextLineage[i]?.nodeName);
    const commonAncestorIndex = firstDivergence === -1 ? xpathSegments.length : firstDivergence;

    // Fall back to contextNode in case of relative xpath
    const anchor = contextLineage[commonAncestorIndex - 1] ?? contextNode;
    const relativePath = xpathSegments.slice(commonAncestorIndex).join('/') || '.';
    const result = this.xmlDoc.evaluate(
      relativePath,
      anchor,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  }

  public getCouchDoc(formConfig: FormConfig): Record<string, any> {
    // TODO not exactly sure we should do the path thing here, but it matches OG.
    return this.nodesToJs(
      this.getChildElements(this.rootElement),
      formConfig.repeatPaths,
      `/${this.rootElement.nodeName}`
    );
  }

  private getNodeWithLineage(contextNode?: Node | null, lineage: Node[] = []): Node[] {
    if (!this.isElementNode(contextNode)) {
      return lineage;
    }
    lineage.unshift(contextNode);
    return this.getNodeWithLineage(contextNode.parentNode, lineage);
  }
}


