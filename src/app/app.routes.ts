import { Route } from '@angular/router';

import { AboutMeComponent } from './core/components/about-me/about-me.component';
import { PrivacyPolicyComponent } from './core/components/privacy-policy/privacy-policy.component';
import { ProductDetailComponent } from './core/components/product-detail/product-detail.component';
import { ProductListComponent } from './core/components/product-list/product-list.component';
import { SupportComponent } from './core/components/support/support.component';

export const routes: Route[] = [
    {
        path: '',
        component: ProductListComponent,
        pathMatch: 'full',
        data: { animation: 'HomePage' },
    },
    {
        path: 'about',
        component: AboutMeComponent,
        data: { animation: 'AboutPage' },
    },
    {
        path: 'support',
        component: SupportComponent,
        data: { animation: 'SupportPage' },
    },
    {
        path: 'privacy-policy',
        component: PrivacyPolicyComponent,
        data: { animation: 'PrivacyPage' },
    },
    {
        path: 'category/:slug',
        component: ProductListComponent,
        pathMatch: 'full',
        data: { animation: 'CategoryPage' },
    },
    {
        path: 'search',
        component: ProductListComponent,
        data: { animation: 'SearchPage' },
    },
    {
        path: 'product/:slug',
        component: ProductDetailComponent,
        data: { animation: 'ProductPage' },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    },
    {
        path: 'account',
        loadChildren: () => import('./account/account.module').then(m => m.AccountModule),
        data: { animation: 'AccountPage' },
    },
    {
        path: 'checkout',
        loadChildren: () => import('./checkout/checkout.module').then(m => m.CheckoutModule),
        data: { animation: 'CheckoutPage' },
    },
    {
        path: '**',
        redirectTo: '',
        pathMatch: 'full',
    },
];
