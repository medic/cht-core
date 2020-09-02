import {Routes} from '@angular/router';
import {AnalyticsComponent} from './analytics.component';
import {RouteGuardProvider} from '../../providers/route-guard.provider';

export const routes:Routes = [
  { path: 'analytics', component: AnalyticsComponent, data: { permissions: ['can_view_analytics'] }, canActivate: [RouteGuardProvider] },
];
