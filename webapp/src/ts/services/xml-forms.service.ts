import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';
import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { DbService } from '@mm-services/db.service';
import { FileReaderService } from '@mm-services/file-reader.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { ParseProvider } from '@mm-providers/parse.provider';

export const TRAINING_FORM_ID_PREFIX: string = 'form:training:';
export const CONTACT_FORM_ID_PREFIX: string = 'form:contact:';

@Injectable({
  providedIn: 'root'
})
export class XmlFormsService {
  private init;
  private observable = new Subject();
  readonly HTML_ATTACHMENT_NAME = 'form.html';
  readonly MODEL_ATTACHMENT_NAME = 'model.xml';

  constructor(
    private authService:AuthService,
    private changesService:ChangesService,
    private contactTypesService:ContactTypesService,
    private dbService:DbService,
    private fileReaderService: FileReaderService,
    private userContactService:UserContactService,
    private xmlFormsContextUtilsService:XmlFormsContextUtilsService,
    private parseProvider:ParseProvider,
    private ngZone:NgZone,
  ) {
    this.init = this.getForms();

    this.changesService.subscribe({
      key: 'xml-forms',
      filter: (change) => {
        return change.id.indexOf('form:') === 0;
      },
      callback: () => {
        this.init = this.getForms();
        this.init
          .then(forms => this.notify(null, forms))
          .catch((err) => this.notify(err));
      }
    });
  }

  private getForms() {
    const options = {
      include_docs: true,
      key: ['form']
    };
    return this.dbService.get()
      .query('medic-client/doc_by_type', options)
      .then((res) => {
        if (!res?.rows) {
          return;
        }

        return res.rows
          .filter(row => this.findXFormAttachmentName(row.doc))
          .map(row => row.doc);
      });
  }

  private getById(internalId) {
    const formId = `form:${internalId}`;
    return this.dbService.get().get(formId);
  }

  private getByView(internalId) {
    return this
      .init
      .then(docs => docs?.filter(doc => doc.internalId === internalId))
      .then(docs => {
        if (!docs.length) {
          const message = `No form found for internalId : "${internalId}"`;
          return Promise.reject(new Error(message));
        }
        if (docs.length > 1) {
          const message = `Multiple forms found for internalId : "${internalId}"`;
          return Promise.reject(new Error(message));
        }
        return docs[0];
      })
      .catch(err => {
        const errorTitle = 'Error in XMLFormService : getByView : ';
        console.error(errorTitle, err.message);
        return Promise.reject(new Error(errorTitle + err.message));
      });
  }

  private evaluateExpression(expression, doc, user, contactSummary) {
    const context = {
      contact: doc,
      user: user,
      summary: contactSummary
    };

    return this.parseProvider.parse(expression)(this.xmlFormsContextUtilsService, context);
  }

  private filterAll(forms, options) {
    return this.ngZone.runOutsideAngular(() => this._filterAll(forms, options));
  }

  private _filterAll(forms, options) {
    return this.userContactService.get().then(user => {
      // clone the forms list so we don't affect future filtering
      forms = forms.slice();
      const promises = forms.map(form => this.filter(form, options, user));
      return Promise
        .all(promises)
        .then((resolutions) => {
          // always splice in reverse...
          for (let i = resolutions.length - 1; i >= 0; i--) {
            if (!resolutions[i]) {
              forms.splice(i, 1);
            }
          }
          return forms;
        });
    });
  }

  private filterContactTypes (context, doc) {
    if (!doc) {
      return Promise.resolve(true);
    }
    const contactType = this.contactTypesService.getTypeId(doc);
    return this.contactTypesService.get(contactType).then(type => {
      if (!type) {
        // not a contact type
        return true;
      }
      if (type.person && (
        (typeof context.person !== 'undefined' && !context.person) ||
        (typeof context.person === 'undefined' && context.place))) {
        return false;
      }
      if (!type.person && (
        (typeof context.place !== 'undefined' && !context.place) ||
        (typeof context.place === 'undefined' && context.person))) {
        return false;
      }
      return true;
    });
  }

  private checkFormExpression(form, doc, user, contactSummary) {
    if (!form.context?.expression) {
      return true;
    }

    try {
      return this.evaluateExpression(
        form.context.expression,
        doc,
        user,
        contactSummary
      );
    } catch (err) {
      console.error(`Unable to evaluate expression for form: ${form._id}`, err);
      return false;
    }
  }

  private checkFormPermissions(form) {
    if (!form.context?.permission) {
      return true;
    }

    return this.authService.has(form.context.permission);
  }

  /**
   * Filters forms based on criteria defined in the options parameter.
   *
   * @param form {Object} : Form's document from CouchDB
   *
   * @param options {Object} : Object for filtering. Possible values:
   *   - ignoreContext (boolean) : Each xml form has a context field, that helps specify in which cases
   *   it should be shown or not shown.
   *   E.g. `{person: false, place: true, expression: "!contact || contact.type === 'clinic'", permission: "xyz"}`
   *   Using ignoreContext = true will ignore that filter.
   *
   *   - doc (Object) : When the context filter is on, the doc to pass to the forms context expression to
   *   determine if the form is applicable.
   *   E.g. for context above, `{type: "district_hospital"}` passes,
   *   but `{type: "district_hospital", contact: {type: "blah"} }` is filtered out.
   *
   *   - contactSummary (Object) : When the context filter is on, the contactSummary is passed to the form's context
   *   expression to determine if the form is applicable.
   *
   *   - reportForms (boolean) : When set true, it will return report forms.
   *   - contactForms (boolean) : When set true, it will return contact forms.
   *   - trainingCards (boolean) : When set true, it will return training forms.
   *   - collectForms (boolean) : When set true, it will return collect forms.
   * To match all forms, then reportForms, contactForms and trainingCards should be undefined.
   *
   * @param user {Object} : User context document from CouchDB.
   */
  private filter(form, options, user) {
    const isContactForm = form._id.indexOf(CONTACT_FORM_ID_PREFIX) === 0;
    const isTrainingCard = form._id.indexOf(TRAINING_FORM_ID_PREFIX) === 0;
    const isCollectForm = !!form.context?.collect;
    const isReportForm = !isContactForm && !isTrainingCard && !isCollectForm;

    const allFormTypes = options.contactForms === undefined
      && options.trainingCards === undefined
      && options.collectForms === undefined
      && options.reportForms === undefined;

    const isFormMatchingFilter = (options.reportForms && isReportForm)
      || (options.collectForms && isCollectForm)
      || (options.contactForms && isContactForm)
      || (options.trainingCards && isTrainingCard);

    if (!allFormTypes && !isFormMatchingFilter) {
      return false;
    }

    // Context filters
    if (options.ignoreContext) {
      return true;
    }

    if (!form.context) {
      // No defined filters
      return true;
    }

    return this
      .filterContactTypes(form.context, options.doc)
      .then(valid => valid && this.canAccessForm(form, user, options));
  }

  async canAccessForm(form, userContact, options?) {
    if (!await this.checkFormPermissions(form)) {
      return false;
    }

    if (options?.shouldEvaluateExpression === false) {
      return true;
    }

    return await this.checkFormExpression(form, options?.doc, userContact, options?.contactSummary);
  }

  private notify(error, forms?) {
    this.observable.next({ error, forms });
  }

  /**
   * @memberof XmlForms
   * @param {Object} doc The document find the xform attachment for
   * @returns {String} The name of the xform attachment.
   */
  private findXFormAttachmentName(doc) {
    return doc &&
      doc._attachments &&
      Object.keys(doc._attachments).find(name => name === 'xml' || name.endsWith('.xml'));
  }

  private hasRequiredAttachments(doc) {
    return doc &&
      doc._attachments &&
      Object.keys(doc._attachments).find(name => name === this.MODEL_ATTACHMENT_NAME) &&
      Object.keys(doc._attachments).find(name => name === this.HTML_ATTACHMENT_NAME) &&
      Object.keys(doc._attachments).find(name => name === 'xml' || name.endsWith('.xml'));
  }

  /**
   * Invokes the given callback with an array of docs containing xforms
   * which the user is allowed to complete. Listens for changes and invokes
   * the callback again when needed.
   *
   * @memberof XmlForms
   *
   * @param {String} name Uniquely identify the callback to stop duplicate registration
   *
   * @param {Object} [options={}] Object for filtering. Possible values:
   *   - ignoreContext (boolean) : Each xml form has a context field, which helps specify in which cases
   *   it should be shown or not shown.
   *   E.g. `{person: false, place: true, expression: "!contact || contact.type === 'clinic'", permission: "xyz"}`
   *   Using ignoreContext = true will ignore that filter.
   *
   *   - doc (Object) : When the context filter is on, the doc to pass to the forms context expression to
   *   determine if the form is applicable.
   *   E.g. for context above, `{type: "district_hospital"      }` passes,
   *   but `{type: "district_hospital", contact: {type: "blah"} }` is filtered out.
   *   See tests for more examples.
   *
   *   - contactSummary (Object) : When the context filter is on, the contactSummary is passed to the form's context
   *   expression to determine if the form is applicable.
   *
   *   - reportForms (boolean) : When set true, it will return report forms.
   *   - contactForms (boolean) : When set true, it will return contact forms.
   *   - trainingCards (boolean) : When set true, it will return training forms.
   *   - collectForms (boolean) : When set true, it will return collect forms.
   * To match all forms, then reportForms, contactForms and trainingCards should be undefined.
   *
   * @param {Function} callback Invoked when complete and again when results have changed.
   */
  subscribe(name, options, callback?) {
    if (!callback) {
      callback = options;
      options = {};
    }

    const cb = ({ error, forms }) => {
      if (error) {
        return callback(error);
      }
      return this
        .filterAll(forms, options)
        .then(results => callback(null, results))
        .catch(err => callback(err));
    };
    this.init.then(forms => cb({ forms, error: undefined }));
    return this.observable.subscribe(cb);
  }

  /**
   * @memberof XmlForms
   * @param {String} internalId The value of the desired doc's internalId field.
   * @returns {Promise} Resolves a doc containing an xform with the given
   *    internal identifier if the user is allowed to see it.
   */
  get(internalId) {
    return this
      .getById(internalId)
      .catch(err => {
        console.warn('Error in XMLFormService : getById : ', err?.message, err?.status, err);
        if (err.status === 404) {
          // fallback for backwards compatibility
          return this.getByView(internalId);
        }
        throw err;
      })
      .then(doc => {
        if (!this.hasRequiredAttachments(doc)) {
          const errorTitle = 'Error in XMLFormService : hasRequiredAttachments : ';
          const errorMessage = `The form "${internalId}" doesn't have required attachments`;
          console.error(errorTitle, errorMessage);
          return Promise.reject(new Error(errorTitle + errorMessage));
        }
        return doc;
      });
  }

  getDocAndFormAttachment(internalId) {
    return this.get(internalId)
      .then(doc => {
        const attachmentName = this.findXFormAttachmentName(doc);
        return this.dbService.get().getAttachment(doc._id, attachmentName)
          .then(blob => this.fileReaderService.utf8(blob))
          .then(xml => ({ doc, xml }))
          .catch(err => {
            const errorTitle = 'Error in XMLFormService : getDocAndFormAttachment : ';
            let errorMessage = `Failed to get the form "${internalId}" xform attachment`;
            if (err.status === 404) {
              errorMessage = `The form "${internalId}" doesn't have an xform attachment`;
            }
            console.error(errorTitle, errorMessage);
            return Promise.reject(new Error(errorTitle + errorMessage));
          });
      });
  }

  /**
   * @memberof XmlForms
   * @param {Object} [options={}] Described in the "listen" function below.
   * @returns {Promise} Resolves an array of docs which contain an
   *   xform the user is allow to complete.
   */
  list(options?) {
    return this.init.then(forms => this.filterAll(forms, options || {}));
  }
}
