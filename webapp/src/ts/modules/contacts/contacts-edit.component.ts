import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { isEqual as _isEqual } from 'lodash-es';
import { ActivatedRoute, Router } from '@angular/router';

import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { FormService } from '@mm-services/form.service';
import { EnketoFormContext } from '@mm-services/enketo.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { DbService } from '@mm-services/db.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { TranslateService } from '@mm-services/translate.service';

import * as moment from 'moment';
import * as Levenshtein from 'levenshtein';
type HierarchyDuplicatePreventionType = typeof window._phdcChanges.hierarchyDuplicatePrevention;
type StrategyForContactType<T extends keyof HierarchyDuplicatePreventionType> = HierarchyDuplicatePreventionType[T];
type KeysType = keyof HierarchyDuplicatePreventionType;
type ConfType = StrategyForContactType<KeysType>;
type Strategy = Exclude<ConfType, undefined>;
type PropsToCheckType = Strategy['props'];
type QueryParamsInfoType = Strategy['queryParams'];
// Each record WILL have the following props, but could have more
type Sibling = {_id: string; name: string; reported_date: number; [key: string]: any};
type Duplicate = {_id: string; name: string; reported_date: number; score: number};
type SuccessType = { status: 'fulfilled'; value: any };
type FailureType = { status: 'rejected'; reason: any };
type ReturnType = SuccessType | FailureType;

@Component({
  templateUrl: './contacts-edit.component.html'
})
export class ContactsEditComponent implements OnInit, OnDestroy, AfterViewInit {
  constructor(
    private store:Store,
    private route:ActivatedRoute,
    private router:Router,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private formService:FormService,
    private contactTypesService:ContactTypesService,
    private dbService:DbService,
    private performanceService:PerformanceService,
    private translateService:TranslateService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  subscription = new Subscription();
  translationsLoadedSubscription;
  private globalActions;
  private xmlVersion;

  enketoStatus;
  enketoSaving;
  enketoError;
  loadingContent;
  contact;
  contactId;
  errorTranslationKey;
  contentError = false;
  cancelCallback;
  enketoEdited;
  enketoContact;

  private routeSnapshot;
  private trackRender;
  private trackEditDuration;
  private trackSave;
  private trackMetadata = { action: '', form: '' };

  private duplicateThreshold = 0; // Default is exact matches
  private formPropPathsToCheck: PropsToCheckType = []; // Name is checked by default
  private queryParams: QueryParamsInfoType;
  private isEdit!: boolean;
  private parentId!: string;
  private contactType!: string;
  private dbLookupRef; // sibling database request
  private needsCleanup = false;
  private readonly parser = new DOMParser(); // Used to parse the xml content & easily grab values
  private readonly strategies = {
    NormalizedLevenshtein: this.normalizedLevenshtein,
    Levenshtein: this.levenshteinDistance
  };

  private strategy = this.levenshteinDistance;

  ngOnInit() {
    this.trackRender = this.performanceService.track();
    this.subscribeToStore();
    this.subscribeToRoute();
  }

  private subscribeToStore() {
    const storeSubscription = combineLatest(
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoEditedStatus),
      this.store.select(Selectors.getEnketoError),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getCancelCallback),
    ).subscribe(([
      enketoStatus,
      enketoSaving,
      enketoEdited,
      enketoError,
      loadingContent,
      cancelCallback,
    ]) => {
      this.enketoError = enketoError;
      this.enketoSaving = enketoSaving;
      this.enketoEdited = enketoEdited;
      this.enketoStatus = enketoStatus;
      this.loadingContent = loadingContent;
      this.cancelCallback = cancelCallback;
    });
    this.subscription.add(storeSubscription);
  }

  private subscribeToRoute() {
    this.routeSnapshot = this.route.snapshot;
    this.resetState();

    const routeSubscription = this.route.params.subscribe((params) => {
      if (_isEqual(this.routeSnapshot.params, params)) {
        // the 1st time we load the form, we must wait for the view to be initialized
        // if we don't skip, it will result in the form being loaded twice
        return;
      }
      this.routeSnapshot = this.route.snapshot;

      this.resetState();
      this.resetFormError();
      this.initForm();
    });
    this.subscription.add(routeSubscription);

    const queryParamsSubscription = this.route.queryParams.subscribe(() => {
      this.routeSnapshot = this.route.snapshot;
      this.setCancelCallback();
    });
    this.subscription.add(queryParamsSubscription);
  }

  private resetState() {
    if (!this.routeSnapshot.params?.id) {
      this.globalActions.unsetSelected();
      this.globalActions.settingSelected();
    }

    this.globalActions.setLoadingContent(true);
    this.globalActions.setShowContent(true);
  }

  private setCancelCallback() {
    const cancelCallback = (router:Router, routeSnapshot) => {
      if (routeSnapshot.queryParams?.from === 'list') {
        router.navigate(['/contacts']);
      } else {
        const parentContactId = routeSnapshot.params.id || routeSnapshot.params.parent_id;
        router.navigate(['/contacts', parentContactId || '']);
      }
    };
    this.globalActions.setCancelCallback(cancelCallback.bind({}, this.router, this.routeSnapshot));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.translationsLoadedSubscription?.unsubscribe();
    this.globalActions.setTitle();
    if (this.enketoContact?.formInstance) {
      this.formService.unload(this.enketoContact.formInstance);
    }
    this.globalActions.clearNavigation();
    this.globalActions.clearEnketoStatus();
  }

  ngAfterViewInit() {
    this.initForm();
  }

  private async initForm() {
    this.contentError = false;
    this.errorTranslationKey = false;

    try {
      const contact = await this.getContact();
      const contactTypeId = this.contactTypesService.getTypeId(contact) || this.routeSnapshot.params?.type;
      const contactType = await this.contactTypesService.get(contactTypeId);
      if (!contactType) {
        throw new Error(`Unknown contact type "${contactTypeId}"`);
      }

      const formId = await this.getForm(contact, contactType);
      if (!formId) {
        throw new Error('Unknown form');
      }

      const titleKey = (contact ? contactType.edit_key : contactType.create_key) as string;
      this.setTitle(titleKey);
      const formInstance = await this.renderForm(formId, titleKey);
      this.setEnketoContact(formInstance);

      // When using the link to go to another form, we need to clean up the duplicate section
      if (this.needsCleanup){
        this.cleanUpDuplicateSection();
        this.needsCleanup = false;
      }

      const docId = this.enketoContact.docId;
      // eslint-disable-next-line eqeqeq
      this.isEdit = docId != null;
      this.parentId = contact?.parent?._id ?? this.routeSnapshot.params.parent_id;
      this.contactType = contactType?.id ?? this.enketoContact?.type;

      if (window?._phdcChanges?.hierarchyDuplicatePrevention){
        if (this.contactType in window._phdcChanges.hierarchyDuplicatePrevention){
          const ct: KeysType = (this.contactType as KeysType);
          const conf: StrategyForContactType<typeof ct> = window._phdcChanges.hierarchyDuplicatePrevention[ct];

          if (conf){
            const strategyType = conf.type;
            this.strategy = this.strategies[strategyType];
            this.formPropPathsToCheck = conf.props ? conf.props: 
              [{form_prop_path: `/data/${this.contactType}/name`, db_doc_ref: 'name'}];
            this.duplicateThreshold = conf.threshold;
            this.queryParams = conf.queryParams;
          } else {
            console.error('No config has been loaded!');
          }
        } else {
          console.warn(`Setup omitted contact type "${this.contactType}" from duplicate check.`);
        }
      } else {
        console.log('Namespace does not contain config');
      }

      // We're kicking off the sibling lookup in the form init to give the request a chance 
      // to make headway in the background before the submit function needs to process the results.
      // The impact should only really be felt by bigger calls.
      this.dbLookupRef = this.dbService
        .get()
        .query('medic-client/contacts_by_parent', { // Existing CHT view
          startkey: [this.parentId, this.contactType],
          endkey: [this.parentId, this.contactType, {}],
          include_docs: true
        });

      this.globalActions.setLoadingContent(false);
    } catch (error) {
      this.errorTranslationKey = error.translationKey || 'error.loading.form';
      this.globalActions.setLoadingContent(false);
      this.contentError = true;
      console.error('Error loading contact form.', error);
    }
  }

  private getFormInstanceData() {
    const type = this.contactTypesService.getTypeId(this.contact);
    if (!type) {
      return null;
    }

    return { [type]: this.contact };
  }

  private getContact() {
    const id = this.routeSnapshot.params.id;
    if (!id) {
      return Promise.resolve();
    }
    return this.lineageModelGeneratorService
      .contact(id, { merge: true })
      .then((result) => result.doc);
  }

  private async getForm(contact, contactType) {
    let formId;
    if (contact) { // editing
      this.contact = contact;
      this.contactId = contact._id;
      formId = contactType.edit_form || contactType.create_form;
      this.trackMetadata.action = 'edit';
    } else { // adding
      this.trackMetadata.action = 'add';
      this.contact = {
        type: 'contact',
        contact_type: this.routeSnapshot.params?.type,
        parent: this.routeSnapshot.params?.parent_id || '',
      };
      this.contactId = null;
      formId = contactType.create_form;

      await this.validateParentForCreateForm();
    }

    return formId;
  }

  private async validateParentForCreateForm() {
    if (!this.contact.parent) {
      const topLevelTypes = await this.contactTypesService.getChildren();
      if (!topLevelTypes.some(({ id }) => id === this.contact.contact_type)) {
        throw new Error(`Cannot create a ${this.contact.contact_type} at the top level. It requires a parent.`);
      }
      return;
    }

    const parent = await this.dbService
      .get()
      .get(this.contact.parent);

    const parentType = this.contactTypesService.getTypeId(parent);
    if (!parentType) {
      throw new Error(`Parent type is undefined for parent UUID ${this.contact.parent}.`);
    }

    const validChildTypes = await this.contactTypesService.getChildren(parentType);
    if (!validChildTypes.some(({ id }) => id === this.contact.contact_type)) {
      throw new Error(`Cannot create a ${this.contact.contact_type} as a child of a ${parentType}.`);
    }
  }

  private setTitle(titleKey: string) {
    this.translationsLoadedSubscription?.unsubscribe();
    this.translationsLoadedSubscription = this.store
      .select(Selectors.getTranslationsLoaded)
      .subscribe((loaded) => {
        if (loaded) {
          this.translateService
            .get(titleKey)
            .then((title) => this.globalActions.setTitle(title));
        }
      });
  }

  private markFormEdited() {
    this.globalActions.setEnketoEditedStatus(true);
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  private async renderForm(formId: string, titleKey: string) {
    const formDoc = await this.dbService.get().get(formId);
    this.xmlVersion = formDoc.xmlVersion;

    this.globalActions.setEnketoEditedStatus(false);

    const formContext = new EnketoFormContext('#contact-form', 'contact', formDoc, this.getFormInstanceData());
    formContext.editedListener = this.markFormEdited.bind(this);
    formContext.valuechangeListener = this.resetFormError.bind(this);
    formContext.titleKey = titleKey;
    const formInstance = await this.formService.render(formContext);

    this.trackMetadata.form = formId;
    this.trackRender?.stop({
      name: [ 'enketo', 'contacts', this.trackMetadata.form, this.trackMetadata.action, 'render' ].join(':'),
      recordApdex: true,
    });
    this.trackEditDuration = this.performanceService.track();

    return formInstance;
  }

  private setEnketoContact(formInstance) {
    this.enketoContact = {
      type: this.contactTypesService.getTypeId(this.contact),
      formInstance: formInstance,
      docId: this.contactId,
    };
  }

  private parseXmlForm(form): Document | undefined {
    // Below line is taken from enketo-core form-model line 114
    const xmlDoc = this.parser.parseFromString(form.getDataStr({ irrelevant: false }), 'text/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      console.error('Error parsing XML:', xmlDoc.getElementsByTagName('parsererror')[0].textContent);
      this.globalActions.setEnketoError('Error parsing xml document');
      return;
    } 
    return xmlDoc; 
  }

  private getFormValues(xmlDoc: Document, propPaths: string[]){
    const values:string[] = [];
    for (const path of propPaths){
      try {
        const value = xmlDoc.evaluate(
          path,
          xmlDoc,
          null,
          XPathResult.STRING_TYPE,
          null
        ).stringValue;
        values.push(value);
      } catch (error) {
        console.error(`Path ${path} value could not be resolved!`);
      }
    }
    return values;
  }

  private queryPropInfo(xmlDoc: Document, info: Exclude<QueryParamsInfoType, undefined>){
    const propPaths = info.valuePaths;
    const values = this.getFormValues(xmlDoc, propPaths);
    const result = info.query(...values);
    return result;
  }

  private calculateSiblingLikenessScore(sibling: Sibling, props: { value: string; compareToDocProp: string }[]) {
    let totalScore = 0;
    let count = 0;

    for (const field of props) {
      if (Object.prototype.hasOwnProperty.call(sibling, field.compareToDocProp)) {
        const test = this.strategy(field.value.toLowerCase(), sibling[field.compareToDocProp].toLowerCase());
        totalScore += test;
        count++;
      }
    }

    return count > 0 ? totalScore / count : null;
  }

  private getLikelyDuplicates(siblings: Sibling[], props: {value: string; compareToDocProp: string}[]){
    const duplicates: Array<Duplicate> = [];
    for (const sibling of siblings){
      const score = this.calculateSiblingLikenessScore(sibling, props);
      if (score !== null && score < this.duplicateThreshold){
        duplicates.push({_id: sibling._id, name: sibling.name, reported_date: sibling.reported_date, score});
      }
    }

    return duplicates;
  }

  // Normalize the distance by dividing by the length of the longer string. 
  // This can make the metric more adaptable across different string lengths
  private normalizedLevenshtein(str1: string, str2: string) {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return (maxLen === 0) ? 0 : (distance / maxLen);
  }

  // The Levenshtein distance is a measure of the number of edits (insertions, deletions, and substitutions) 
  // required to change one string into another.
  private levenshteinDistance(str1: string, str2: string) {
    return new Levenshtein(str1, str2).distance;
  }

  // Note: Look into 'https://www.npmjs.com/package/fuzzball' to perform various matching calculations

  private cleanUpDuplicateSection() {
    const $duplicateInfoElement = $('#contact-form').find('#duplicate_info');
    $duplicateInfoElement.empty(); // Remove all child nodes
    $duplicateInfoElement.hide();
  }

  // Promise.allSettled is not available due to the app's javascript version
  private allSettledFallback(promises: Promise<Exclude<any, null | undefined>>[]): Promise<ReturnType[]> {
    return Promise.all(
      promises.map(promise => promise
        .then((value): SuccessType => ({ status: 'fulfilled', value }))
        .catch((reason): FailureType => ({ status: 'rejected', reason })))
    );
  }

  private buildDuplicateHeader(count: number){
    return `<p>${count} potential duplicate item(s) found:</p>`;
  }

  private buildDuplicateItem(d: Duplicate, count: number){
    const link = `#/contacts/${d._id}/edit`;
    const date = moment(d.reported_date).format('ddd MMM DD YYYY HH:mm:ss');
    return `
      <p>${count}) "${d.name}" <br>
      Created on: ${date} <br>
      <a class="duplicate-navigate-link" href="${link}" rel="noopener">Take me there</a> 
      </p>`;
  }

  private outputDuplicates(duplicates: Duplicate[]){
    const $duplicateInfoElement = $('#contact-form').find('#duplicate_info');
    $duplicateInfoElement.empty(); // Remove all child nodes
    $duplicateInfoElement.show();
    // TODO: create a template component where these values are fed into.
    // TODO: Use angular instead of jQuery?
    let content = this.buildDuplicateHeader(duplicates.length);
    let count = 0;
    for (const d of duplicates){
      content += this.buildDuplicateItem(d, count+1);
      count++;
    }
    $duplicateInfoElement.append(content);
    $duplicateInfoElement.on('click', '.duplicate-navigate-link', () => {
      this.needsCleanup = true;
    });
  }

  private ensureUniqueItem(xmlDoc: Document, docId: string, docs: Sibling[]) {
    const siblings : Sibling[] = docs.filter((element) => !((this.isEdit && element._id === docId)));
    
    const additionalFieldsValues:string[] = this.formPropPathsToCheck ? 
      this.getFormValues(xmlDoc, this.formPropPathsToCheck.map((e) => e.form_prop_path)) : [];
    const additionalPropValuesToCheck = this.formPropPathsToCheck!.map((obj, i) => { 
      return { value: additionalFieldsValues[i], compareToDocProp: obj.db_doc_ref}; 
    });
    const duplicates = this.getLikelyDuplicates(siblings, additionalPropValuesToCheck);

    if (duplicates.length > 0){
      this.globalActions.setEnketoError('Duplicates found');
      this.outputDuplicates(duplicates);
      return false;
    }

    return true;
  }

  save() {
    if (this.enketoSaving) {
      console.debug('Attempted to call contacts-edit:save more than once');
      return;
    }

    this.trackEditDuration?.stop({
      name: [ 'enketo', 'contacts', this.trackMetadata.form, this.trackMetadata.action, 'user_edit_time' ].join(':'),
    });
    this.trackSave = this.performanceService.track();

    const form = this.enketoContact.formInstance;
    const docId = this.enketoContact.docId;
    this.globalActions.setEnketoSavingStatus(true);
    this.globalActions.setEnketoError(null);

    const xmlDoc = this.parseXmlForm(form);
    if (!xmlDoc){
      throw new Error('Could not parse form');
    }

    const shouldCircumventDuplicateCheck = this.queryParams ? this.queryPropInfo(xmlDoc, this.queryParams) : false;

    return this.allSettledFallback([form.validate(), this.dbLookupRef])
      .then((results) => {
        let valid = results[0].status === 'fulfilled'? results[0].value : false;
        
        if (valid && !shouldCircumventDuplicateCheck) {
          if (results[1].status === 'fulfilled'){
            const additionalCheckResult = results[1].value;
            const map = additionalCheckResult.rows.map((row: { doc: Sibling }) => row.doc);
            valid = this.ensureUniqueItem(xmlDoc, docId, map);
          } else {
            valid = false;
            this.globalActions.setEnketoError('Sibling lookup failed');
          }
        }
        
        return valid;
      })
      .then((valid) => {
        if (!valid) {
          throw new Error('Validation failed.');
        }

        // Updating fields before save. Ref: #6670.
        $('form.or').trigger('beforesave');

        return this.formService
          .saveContact(form, docId, this.enketoContact.type, this.xmlVersion)
          .then((result) => {
            console.debug('saved contact', result);

            this.globalActions.setEnketoSavingStatus(false);
            this.globalActions.setEnketoEditedStatus(false);

            this.trackSave?.stop({
              name: [ 'enketo', 'contacts', this.trackMetadata.form, this.trackMetadata.action, 'save' ].join(':'),
              recordApdex: true,
            });

            this.translateService
              .get(docId ? 'contact.updated' : 'contact.created')
              .then(snackBarContent => this.globalActions.setSnackbarContent(snackBarContent));

            this.router.navigate(['/contacts', result.docId]);
          })
          .catch((err) => {
            console.error('Error submitting form data', err);

            this.globalActions.setEnketoSavingStatus(false);
            return this.translateService
              .get('Error updating contact')
              .then(error => this.globalActions.setEnketoError(error));
          });
      })
      .catch(() => {
        // validation messages will be displayed for individual fields.
        // That's all we want, really.
        this.globalActions.setEnketoSavingStatus(false);
      });
  }

  navigationCancel() {
    this.globalActions.navigationCancel();
  }
}
