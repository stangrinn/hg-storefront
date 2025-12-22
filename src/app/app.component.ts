import { Component, OnInit } from '@angular/core';
import { ChildrenOutletContexts, Router, RouterEvent } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { GetCollectionsQuery, GetCollectionsQueryVariables } from './common/generated-types';
import { GET_COLLECTIONS } from './common/graphql/documents.graphql';
import { routeAnimations, fadeAnimation, slideAnimation } from './core/animations/route-animations';
import { DataService } from './core/providers/data/data.service';
import { StateService } from './core/providers/state/state.service';

@Component({
    selector: 'hgart-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    animations: [fadeAnimation, routeAnimations, slideAnimation],
})
export class AppComponent implements OnInit {
    cartDrawerVisible$: Observable<boolean>;
    mobileNavVisible$: Observable<boolean>;
    isHomePage$: Observable<boolean>;
    topCollections$: Observable<GetCollectionsQuery['collections']['items']>;

    navigation = {
        support: [
            {name: 'Help', href: '#'},
            {name: 'Track order', href: '#'},
            {name: 'Shipping', href: '#'},
            {name: 'Returns', href: '#'},
        ],
        company: [
            {name: 'About', href: '#'},
            {name: 'Blog', href: '#'},
            {name: 'Corporate responsibility', href: '#'},
            {name: 'Press', href: '#'},
        ],
    };

    constructor(private router: Router,
                private stateService: StateService,
                private dataService: DataService,
                private contexts: ChildrenOutletContexts) {
    }

    ngOnInit(): void {
        this.cartDrawerVisible$ = this.stateService.select(state => state.cartDrawerOpen);
        this.mobileNavVisible$ = this.stateService.select(state => state.mobileNavMenuIsOpen);
        this.isHomePage$ = this.router.events.pipe(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filter<any>(event => event instanceof RouterEvent),
            map((event: RouterEvent) => event.url === '/'),
        );
        this.topCollections$ = this.dataService.query<GetCollectionsQuery, GetCollectionsQueryVariables>(GET_COLLECTIONS, {
            options: {take: 25, topLevelOnly: true}
        }).pipe(
            map(({collections}) => collections.items)
        );
    }

    openCartDrawer() {
        this.stateService.setState('cartDrawerOpen', true);
    }

    closeCartDrawer() {
        this.stateService.setState('cartDrawerOpen', false);
    }

    /**
     * Get route animation state for smooth page transitions
     * Includes URL params to trigger animation on param changes
     */
    getRouteAnimationData() {
        const context = this.contexts.getContext('primary');
        const route = context?.route?.snapshot;
        const animation = route?.data?.['animation'];
        const params = route?.params;
        
        // Combine animation state with params to trigger on param changes
        return animation ? `${animation}-${JSON.stringify(params)}` : '';
    }
}
