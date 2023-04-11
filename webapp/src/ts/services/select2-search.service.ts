import { Injectable } from '@angular/core';
import { sortBy as _sortBy } from 'lodash-es';
import * as phoneNumber from '@medic/phone-number';

import { FormatProvider } from '@mm-providers/format.provider';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { SearchService } from '@mm-services/search.service';
import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { ContactMutedService } from '@mm-services/contact-muted.service';
import { TranslateService } from '@mm-services/translate.service';

@Injectable({
  providedIn: 'root'
})
export class Select2SearchService {

  constructor(
    private formatProvider: FormatProvider,
    private translateService: TranslateService,
    private lineageModelGeneratorService: LineageModelGeneratorService,
    private searchService: SearchService,
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private contactMutedService: ContactMutedService
  ) { }

  private defaultTemplateResult(row) {
    if (!row.doc) {
      return $('<span>' + (row.text || '&nbsp;') + '</span>');
    }
    // format escapes the content for us, and if we just return
    // a string select2 escapes it again, so return an element instead.
    return $(this.formatProvider.sender(row.doc));
  }

  private defaultTemplateSelection(row) {
    if (row.doc) {
      return row.doc.name + (row.doc.muted ? ' (' + this.translateService.instant('contact.muted') + ')' : '');
    }

    return row.text;
  }

  private defaultSendMessageExtras(row) {
    return row;
  }

  private prepareRows(documents) {
    return _sortBy(documents, doc => doc.name)
      .map(doc => ({ id: doc._id, doc: doc }));
  }

  private query(params, successCb, failureCb, options, types) {
    const currentQuery = params.data.q;
    const skip = ((params.data.page || 1) - 1) * options.pageSize;
    const filters = {
      types: { selected: types },
      search: params.data.q
    };
    const searchOptions = {
      limit: options.pageSize,
      skip,
      hydrateContactNames: true,
    };

    this.searchService
      .search('contacts', filters, searchOptions)
      .then((documents) => {
        if (currentQuery === params.data.q) {
          successCb({
            results: options.sendMessageExtras(this.prepareRows(documents)),
            pagination: {
              more: documents.length === options.pageSize
            }
          });
        }
      })
      .catch((err) => {
        if (currentQuery === params.data.q) {
          failureCb(err);
        }
      });
  }

  private getDoc(id) {
    return this.lineageModelGeneratorService
      .contact(id, { merge: true })
      .then((contact) => {
        contact.doc.muted = this.contactMutedService.getMuted(contact.doc);
        return contact.doc;
      })
      .catch(err => {
        if (err.code === 404) {
          console.warn('Unable to hydrate select2 document', err);
          return undefined;
        }
        throw err;
      });
  }

  private resolveInitialValue(selectEl, options, settings) {
    if (options.initialValue) {
      if (!selectEl.children('option[value="' + options.initialValue + '"]').length) {
        selectEl.append($('<option value="' + options.initialValue + '"/>'));
      }
      selectEl.val(options.initialValue);
    } else {
      selectEl.val('');
    }

    let resolution;
    let value = selectEl.val();

    if (!(value && value.length)) {
      resolution = Promise.resolve();
    } else {
      if (Array.isArray(value)) {
        // NB: For now we only support resolving one initial value
        // multiple is not an existing use case for us
        value = value[0];
      }
      if (phoneNumber.validate(settings, value)) {
        // Raw phone number, don't resolve from DB
        const text = options.templateSelection({ text: value });
        selectEl.select2('data')[0].text = text;
        resolution = Promise.resolve();
      } else {
        resolution = this.getDoc(value)
          .then(doc => this.setDoc(selectEl, doc))
          .catch(err => console.error('Select2 failed to get document', err));
      }
    }

    return resolution
      .then(() => {
        selectEl.trigger('change');
        return selectEl;
      });
  }

  private initSelect2(selectEl, options, types) {
    selectEl.select2({
      ajax: {
        delay: 500,
        transport: (params, successCb, failureCb) => this.query(params, successCb, failureCb, options, types)
      },
      allowClear: true,
      placeholder: '',
      tags: options.tags,
      templateResult: options.templateResult,
      templateSelection: options.templateSelection,
      width: '100%',
      minimumInputLength: this.sessionService.isOnlineOnly() ? 3 : 0
    });

    if (options.allowNew) {
      const addNewText = this.translateService.instant('contact.type.' + types[0] + '.new');
      const button = $('<a class="btn btn-link add-new"><i class="fa fa-plus"></i> ' + addNewText + '</a>')
        .on('click', () => {
          selectEl.append($('<option value="NEW" selected="selected">' + addNewText + '</option>'));
          selectEl.trigger('change');
        });
      selectEl.after(button);
    }

    // Hydrate and re-set real doc on change
    // !tags -> only support single values, until there is a use-case
    if (!options.tags) {
      selectEl.on('select2:select', (e) => {
        const docId = e.params && e.params.data && e.params.data.id;

        if (docId) {
          this.getDoc(docId)
            .then(doc => {
              this.setDoc(selectEl, doc);
              selectEl.trigger('change');
            })
            .catch(err => console.error('Select2 failed to get document', err));
        }
      });
    }
  }

  private setDoc(selectEl, doc) {
    if (doc) {
      selectEl.select2('data')[0].doc = doc;  // Set the value
      // In case an unknown doc was set before, remove the "missing" style from select2
      selectEl.removeClass('select2-missing');
    } else {
      // Because doc was deleted or the user don't have access to,
      // a fixed title in the option selected is set with a "missing" style
      selectEl.addClass('select2-missing');
      selectEl.select2('data')[0].text = this.translateService.instant('unknown.contact');
    }
  }

  async init(selectEl, _types, _options:any = {}) {
    const settings = await this.settingsService.get();
    const types = Array.isArray(_types) ? _types : [ _types ];
    const options = {
      ..._options,
      templateSelection: _options.templateSelection || this.defaultTemplateSelection.bind(this),
      initialValue: _options.initialValue || selectEl.val(),
      sendMessageExtras: _options.sendMessageExtras || this.defaultSendMessageExtras,
      allowNew: _options.allowNew || false,
      pageSize: _options.pageSize || 20,
      tags: _options.tags || false,
      templateResult: _options.templateResult || this.defaultTemplateResult.bind(this)
    };

    if (options.allowNew && types.length !== 1) {
      throw new Error('Unsupported options: cannot allowNew with ' + types.length + ' types');
    }

    this.initSelect2(selectEl, options, types);

    return this.resolveInitialValue(selectEl, options, settings);
  }

}
