import { Directive, Input, HostBinding, OnChanges } from '@angular/core';
import { AuthService } from '@admin-tool-services/auth.service';

@Directive({
  standalone: true,
  selector: '[mmAuth]'
})
export class AuthDirective implements OnChanges {
  @Input() mmAuth?: string;
  @Input() mmAuthAny?: any;
  @Input() mmAuthOnline?: boolean;

  private hidden = true;

  constructor(private authService: AuthService) { }

  private compile() {
    const dynamicChecks = allowed => {
      if (allowed && this.mmAuthAny) {
        const mmAuthAny = Array.isArray(this.mmAuthAny) ? this.mmAuthAny : [this.mmAuthAny];
        if (mmAuthAny.some(property => property === true)) {
          this.hidden = false;
          return;
        }

        const permissionsGroups: string[][] = mmAuthAny
          .filter(property => Array.isArray(property) || typeof property === 'string')
          .map(property => Array.isArray(property)
            ? (property as any[]).flat(Infinity) as string[]
            : [ property as string ]);

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
