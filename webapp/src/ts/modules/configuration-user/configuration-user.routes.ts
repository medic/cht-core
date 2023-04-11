import { Routes } from '@angular/router';

import { ConfigurationUserComponent } from '@mm-modules/configuration-user/configuration-user.component';

export const routes:Routes = [
  {
    path: 'user',
    component: ConfigurationUserComponent,
    data: { tab: 'user'},
  }
];
