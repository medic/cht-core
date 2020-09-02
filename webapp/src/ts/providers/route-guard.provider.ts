import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import {Injectable} from '@angular/core';
import { AuthService } from '../services/auth.service';
import { from } from 'rxjs';

@Injectable()
export class RouteGuardProvider implements CanActivate {
  constructor(
    private authService:AuthService,
    private router:Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (!route.data || !route.data.permissions) {
      return true;
    }

    return from(
      this.authService.has(route.data.permissions).then((canActivate) => {
        if (!canActivate) {
          this.router.navigate(['error/403']);
        }
        return canActivate;
      })
    )
  }
}
