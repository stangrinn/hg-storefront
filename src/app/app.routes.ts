import { Route } from '@angular/router';

import { AboutMeComponent } from './core/components/about-me/about-me.component';
import { PrivacyPolicyComponent } from './core/components/privacy-policy/privacy-policy.component';
import { ProductDetailComponent } from './core/components/product-detail/product-detail.component';
import { ProductListComponent } from './core/components/product-list/product-list.component';
import { SupportComponent } from './core/components/support/support.component';

export const routes: Route[] = [
    {
        path: 'about',
        component: AboutMeComponent,
    },
    {
        path: 'support',
        component: SupportComponent,
    },
    {
        path: 'privacy-policy',
        component: PrivacyPolicyComponent,
    },
    {
        path: 'category/:slug',
        component: ProductListComponent,
        pathMatch: 'full',
    },
    {
        path: 'search',
        component: ProductListComponent,
    },
    {
        path: 'product/:slug',
        component: ProductDetailComponent,
    },
    {
        path: 'account',
        loadChildren: () => import('./account/account.module').then(m => m.AccountModule),
    },
    {
        path: 'checkout',
        loadChildren: () => import('./checkout/checkout.module').then(m => m.CheckoutModule),
    },
];
