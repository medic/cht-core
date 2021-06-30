import { Injectable } from '@angular/core';
import { cloneDeep } from 'lodash-es';

import { SettingsService } from '@mm-services/settings.service';
import { ValidationService } from '@mm-services/validation.service';
import { MutingTransition } from '@mm-services/transitions/muting.transition';

@Injectable({
  providedIn: 'root'
})
export class TransitionsService {
  constructor(
    private settingsService:SettingsService,
    private validationService:ValidationService,
    private mutingTransition:MutingTransition,
  ) {
  }
  private readonly AVAILABLE_TRANSITIONS = [
    { name: 'muting', transition: this.mutingTransition }
  ];
  private loadedTransitions = [];

  private inited;
  private settings;

  init() {
    if (!this.inited) {
      this.inited = this.loadTransitions();
    }
    return this.inited;
  }

  private async loadSettings() {
    this.settings = (await this.settingsService.get()) || {};
  }

  private async loadTransitions() {
    try {
      await this.loadSettings();
      await this.validationService.init();

      this.AVAILABLE_TRANSITIONS.forEach(({ name, transition }) => {
        if (!this.isEnabled(name)) {
          return;
        }

        if (!transition.init(this.settings)) {
          return;
        }

        this.loadedTransitions.push({ name, transition });
      });
    } catch (err) {
      console.error('Error loading transitions', err);
    }
  }

  private isEnabled(transitionName) {
    const transitionsConfig = this.settings.transitions || {};
    const transitionConfig = transitionsConfig[transitionName];
    if (transitionConfig && !transitionConfig.disable && transitionConfig.client_side !== false) {
      return true;
    }
  }

  async applyTransitions(docs) {
    if (!this.inited) {
      console.warn('Attempt to run transitions without initialization');
      return Promise.resolve(docs);
    }

    await this.inited;
    if (!this.loadedTransitions.length) {
      return Promise.resolve(docs);
    }

    // keep a copy of the docs, to return in case transitions fail and we end up with partially edited docs
    const originalDocs = cloneDeep(docs);

    for (const loadedTransition of this.loadedTransitions) {
      try {
        if (!loadedTransition.transition.filter(docs)) {
          console.debug('transition', loadedTransition.name, 'filter failed');
          continue;
        }

        docs = await loadedTransition.transition.run(docs);
      } catch (err) {
        console.error('Error while running transitions', err);
        // don't run partial transitions
        return originalDocs;
      }
    }

    return docs;
  }
}
