import {Routes} from '@angular/router';
import {RouteGuardProvider} from '../../providers/route-guard.provider';
import {AnalyticsComponent} from '../analytics/analytics.component';

export const routes:Routes = [
  {
    path: 'analytics',
    component: AnalyticsComponent,
    data: { permissions: ['can_view_analytics'], tab: 'analytics' },
    canActivate: [RouteGuardProvider]
  },
];
