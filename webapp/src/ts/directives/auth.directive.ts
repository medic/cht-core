import * as _ from 'lodash-es';
import { Directive, ElementRef, Input, HostBinding, OnChanges } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[mmAuth]'
})
export class AuthDirective implements OnChanges {
  @Input() mmAuth: string;
  @Input() mmAuthAny: any;
  @Input() mmAuthOnline: boolean;

  private hidden = true;

  constructor(
    private el: ElementRef,
    private authService: AuthService,
  ) { }

  private compile() {
    const dynamicChecks = allowed => {
      if (allowed && this.mmAuthAny) {
        const mmAuthAny = Array.isArray(this.mmAuthAny) ? this.mmAuthAny : [this.mmAuthAny];
        if (mmAuthAny.some(property => property === true)) {
          this.hidden = false;
          return;
        }

        const permissionsGroups = mmAuthAny
          .filter(property => Array.isArray(property) || _.isString(property))
          .map(property => (Array.isArray(property) && _.flattenDeep(property)) || [ property ]);

        if (!permissionsGroups.length) {
          this.hidden = true;
          return;
        }

        return updateVisibility([ this.authService.any(permissionsGroups) ]);
      }
    };

    const updateVisibility = promises => {
      return Promise
        .all(promises)
        .then(permissions => {
          const allPermissions = permissions.every(permission => !!permission);
          if (allPermissions) {
            this.hidden = false;
            return true;
          }

          this.hidden = true;
          return false;
        });
    };

    const staticChecks = () => {
      const promises: Promise<boolean>[] = [];
      if (this.mmAuth) {
        promises.push(this.authService.has(this.mmAuth.split(',')));
      }

      if (this.mmAuthOnline !== undefined) {
        const onlineResult = this.authService.online(this.mmAuthOnline);
        promises.push(Promise.resolve(onlineResult));
      }

      if (!promises.length) {
        return true;
      }

      return updateVisibility(promises);
    };

    const result = staticChecks();
    if (result === true) {
      dynamicChecks(true);
    } else {
      result.then(dynamicChecks);
    }
  }

  ngOnChanges() {
    this.compile();
  }

  @HostBinding('class.hidden')
  public get isHidden(): boolean {
    return this.hidden;
  }
}
