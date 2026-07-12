import { Injectable, NgZone } from '@angular/core';
import type JQuery from 'jquery';
import events from 'enketo-core/src/js/event';
import { DOC_TYPES } from '@medic/constants';
import { v7 as uuid } from 'uuid';
import { Xpath } from '@mm-providers/xpath-element-path.provider';

@Injectable({
  providedIn: 'root'
})
export class NewEnketoService {
  constructor(
    private readonly ngZone: NgZone
  ) { }

  async saveContact() {

  }

  // TODO Make sure extractLineageService.extract is called on given contact.
  async saveReport(form: EnketoForm, defaultData: Record<string, any> = {}) {
    return this.ngZone.runOutsideAngular(async () => {
      await form.validate();
      const reportDoc = this.getReportDoc(form.config.internalId, defaultData);


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
}



// TODO Should return direct from xml-forms.service...

export class EnketoForm {
  constructor(
    private readonly form: Record<string, any>,
    public readonly config: FormConfig
  ) { }

  public async validate() {
    const valid = await this.form.validate();
    if (!valid) {
      throw new Error('Form is invalid');
    }
    this.form.view.html.dispatchEvent(events.BeforeSave());
  }

  public async getOutputDocs(rootDoc: Record<string, any>) {
    const docData = new EnketoDocData(this.form.getDataStr({ irrelevant: false }), rootDoc._id);
    const allDocs = [
      docData,
      ...docData.getDbDocs()
    ];

    this.populateDbDocRefElements(allDocs);

    // TODO Since we are making docData out of these anyway, maybe we use that to hold id, etc and help with mapping.
    // TODO Would it add complication though to NOT have node identity? (If we deserialize each DocData into a different
    //  xml tree

  }

  private populateDbDocRefElements(allDocs: EnketoDocData[]) {
    const [rootDoc] = allDocs;
    rootDoc.dbDocRefElements.forEach(element => {
      const $element = $(element);
      const reference = $element.attr('db-doc-ref');
      const referencedNode = rootDoc.getNodeByXpath(element, reference);
      if (!referencedNode) {
        return;
      }
      const refId = allDocs
        .find(({ contextElement }) => contextElement === referencedNode)
        ?.id;
      if (!refId) {
        return;
      }

      // TODO if this is on a DB doc, it will not be populated....
      // TODO Can we run this for _each_ of allDocs?
      $element.text(refId);
    });
  }
}

export class FormConfig {
  private readonly $xml: JQuery<Element>;

  constructor(
    public readonly doc: Record<string, any>,
    html: string,
    xml: string,
    model: string
  ){
    this.$xml = $(xml);
  }

  // TODO should a cache/pre-load this?
  public getRepeatPaths() {
    return this.$xml
      .find('repeat[nodeset]')
      .map((_, element) => $(element).attr('nodeset'))
      .get();
  }
  // TODO Figure out how this is used since the imple is not super gernal
  // - Only used as part of getClosestPath which is only used to set db-doc-ref
  // - What we are actually trying to do is fine the id value to use for the db-doc-ref...
  // public getRelativePath = (rawPath: string) => {
  //   const path = rawPath.trim();
  //   const repeatReference = this
  //     .getRepeatPaths()
  //     .find(repeatPath => path === repeatPath || path.startsWith(`${repeatPath}/`));
  //   if (repeatReference) {
  //     if (repeatReference === path) {
  //       // when the path is the repeat element itself, return the repeat element node name
  //       return path.split('/').slice(-1)[0];
  //     }
  //
  //     return path.replace(`${repeatReference}/`, '');
  //   }
  //
  //   if (path.startsWith('./')) {
  //     return path.replace('./', '');
  //   }
  // };
}

class EnketoDocData {
  // TODO Can hold its own id and maybe its own root path (useful for remembering
  //  where it was at and calculating against repeats)

  private readonly dataXml: XMLDocument;
  private readonly $rootElement: JQuery<Element>;
  public readonly contextElement: Element;
  public readonly rootElement: Element;

  constructor(
    data: string,
    public readonly id: string,
    contextElement?: Element
  ) {
    this.dataXml = $.parseXML(data); // TODO Do we need this as a XMLDocument?
    this.$rootElement = $($(this.dataXml).children()[0]);
    this.rootElement = this.$rootElement[0];
    this.contextElement = contextElement || this.rootElement;
  }

  public getDbDocRefElements() {
    this.$rootElement
      .find('[db-doc-ref]')
      .filter((_, el) => !$(el).parents('[db-doc=true]').not(this.rootElement).length)
      .get();
  }

  public getDbDocs() {
    const getDbDocId = (e: Element) => $(e).children('_id').text() || uuid();
    const dbDocElements = this.$rootElement
      .find('[db-doc=true]')
      .get();
    return dbDocElements.map(dbDoc => new EnketoDocData(
      dbDoc.outerHTML,
      getDbDocId(dbDoc),
      dbDoc
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
    const result = this.dataXml.evaluate(
      relativePath,
      anchor,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  }

  public getDocObject(formConfig: FormConfig) {
    // TODO not repeating the root path logic from `reportRecordToJs`.  Not sure what that is doing...
    return this.nodesToJs([this.rootElement], formConfig.getRepeatPaths());
  }

  private isElementNode(node: unknown): node is Element {
    return node?.['nodeType'] === Node.ELEMENT_NODE;
  }

  // TODO Any methods not using actual state could maybe be moved to helper.
  private nodesToJs(nodes: Element[], repeatPaths: string[], path = '') {
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
    // binary values are attached to the doc instead of inlined
    return node.getAttribute('type') === 'binary' ? '' : node.textContent;
  }

  private getNodeWithLineage(contextNode?: Node | null, lineage: Node[] = []): Node[] {
    if (!this.isElementNode(contextNode)) {
      return lineage;
    }
    lineage.unshift(contextNode);
    return this.getNodeWithLineage(contextNode.parentNode, lineage);
  }
}


