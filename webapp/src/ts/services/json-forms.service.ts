import {Injectable} from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class JsonFormsService {
  constructor(private settingsService:SettingsService) {}

  get() {
    return this.settingsService.get().then((settings:any) => {
      if (!settings.forms) {
        return [];
      }
      return Object.keys(settings.forms).map((key) => {
        const form = settings.forms[key];
        return {
          code: form.meta.code,
          name: form.meta.label,
          translation_key: form.meta.translation_key,
          subject_key: form.meta.subject_key,
          icon: form.meta.icon
        };
      });
    })
  }
}
