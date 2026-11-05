import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, scan, shareReplay, startWith, switchMap, take, tap, } from 'rxjs/operators';

import {
    GetCollectionQuery,
    GetCollectionQueryVariables,
    SearchProductsQuery,
    SearchProductsQueryVariables
} from '../../../common/generated-types';
import { getRouteArrayParam } from '../../../common/utils/get-route-array-param';
import { AssetPreviewPipe } from '../../../shared/pipes/asset-preview.pipe';
import { DataService } from '../../providers/data/data.service';
import { PageLoadState, PageResponseService } from '../../providers/page-response.service';
import { StateService } from '../../providers/state/state.service';

import { GET_COLLECTION, SEARCH_PRODUCTS } from './product-list.graphql';

type SearchItem = SearchProductsQuery['search']['items'][number];

type CollectionLoadResult = {
    state: PageLoadState;
    collection: GetCollectionQuery['collection'];
};

@Component({
    selector: 'hgart-product-list',
    templateUrl: './product-list.component.html',
    styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
    products$: Observable<SearchItem[]>;
    totalResults$: Observable<number>;
    collection$: Observable<GetCollectionQuery['collection']>;
    facetValues: SearchProductsQuery['search']['facetValues'];
    unfilteredTotalItems = 0;
    activeFacetValueIds$: Observable<string[]>;
    searchTerm$: Observable<string>;
    displayLoadMore$: Observable<boolean>;
    loading$: Observable<boolean>;
    breadcrumbs$: Observable<Array<{id: string; name: string; }>>;
    mastheadBackground$: Observable<SafeStyle>;
    
    pageState$: Observable<PageLoadState>;
    private reload = new BehaviorSubject<void>(undefined);
    private currentPage = 0;
    private refresh = new BehaviorSubject<void>(undefined);
    readonly placeholderProducts = Array.from({ length: 12 }).map(() => null);

    constructor(private dataService: DataService,
                private route: ActivatedRoute,
                private stateService: StateService,
                private sanitizer: DomSanitizer,
                private location: Location,
                private pageResponse: PageResponseService) { }

    ngOnInit() {
        const perPage = 24;
        const collectionSlug$ = this.route.paramMap.pipe(
            map(pm => pm.get('slug')),
            distinctUntilChanged(),
            tap(slug => {
                this.stateService.setState('lastCollectionSlug', slug || null);
                this.currentPage = 0;
            }),
            shareReplay(1),
        );
        this.activeFacetValueIds$ = this.route.paramMap.pipe(
            map(pm => getRouteArrayParam(pm, 'facets')),
            distinctUntilChanged((x, y) => x.toString() === y.toString()),
            tap(() => {
                this.currentPage = 0;
            }),
            shareReplay(1),
        );
        this.searchTerm$ = this.route.queryParamMap.pipe(
            map(pm => pm.get('search') || ''),
            distinctUntilChanged(),
            tap(() => {
                this.currentPage = 0;
            }),
            shareReplay(1),
        );

        const emptyResults: SearchProductsQuery = {
            search: { items: [], totalItems: 0, facetValues: [] },
        };
        const collectionResult$ = combineLatest([collectionSlug$, this.reload]).pipe(
            switchMap(([slug]) => {
                if (!slug) {
                    return of<CollectionLoadResult>({ state: 'ready', collection: undefined });
                }
                return this.dataService.query<GetCollectionQuery, GetCollectionQueryVariables>(GET_COLLECTION, {
                    slug,
                }).pipe(
                    map((data): CollectionLoadResult => ({
                        state: data.collection ? 'ready' : 'not-found',
                        collection: data.collection,
                    })),
                    catchError(() => of<CollectionLoadResult>({ state: 'error', collection: undefined })),
                    startWith<CollectionLoadResult>({ state: 'loading', collection: undefined }),
                );
            }),
            tap(result => {
                if (result.state === 'not-found' || result.state === 'error') {
                    this.pageResponse.setStatus(result.state === 'not-found' ? 404 : 503);
                }
            }),
            shareReplay(1),
        );
        this.collection$ = collectionResult$.pipe(map(result => result.collection));

        const assetPreviewPipe = new AssetPreviewPipe();

        this.mastheadBackground$ = this.collection$.pipe(
            map(c => 'url(' + assetPreviewPipe.transform(c?.featuredAsset || undefined, 1000, 300) + ')'),
            map(style => this.sanitizer.bypassSecurityTrustStyle(style)),
        );

        this.breadcrumbs$ = this.collection$.pipe(
            map(collection => {
                if (collection) {
                    return collection.breadcrumbs;
                } else {
                    return [{
                        id: '',
                        name: 'Home',
                    }, {
                        id: '',
                        name: 'Search',
                    }];
                }
            }),
        );

        const triggerFetch$ = combineLatest([collectionResult$, this.activeFacetValueIds$, this.searchTerm$, this.refresh]);
        
        const getInitialFacetValueIds = () => {
            combineLatest([collectionResult$, this.searchTerm$]).pipe(
                take(1),
                switchMap(([result, term]) => {
                    if (result.state !== 'ready') {
                        return of(emptyResults);
                    }
                    const collection = result.collection;
                    return this.dataService.query<SearchProductsQuery, SearchProductsQueryVariables>(SEARCH_PRODUCTS, {
                        input: {
                            term,
                            groupByProduct: true,
                            collectionId: collection?.id,
                            take: perPage,
                            skip: this.currentPage * perPage,
                        },
                    });
                }),
                ).subscribe(data => {
                    this.facetValues = data.search.facetValues;
                    this.unfilteredTotalItems = data.search.totalItems;
                });
        };
        
        const searchResult$ = triggerFetch$.pipe(
            switchMap(([result, facetValueIds, term]) => {
                if (result.state !== 'ready') {
                    return of({ state: result.state, data: emptyResults, loading: result.state === 'loading' });
                }
                const collection = result.collection;
                return this.dataService.query<SearchProductsQuery, SearchProductsQueryVariables>(SEARCH_PRODUCTS, {
                    input: {
                        term,
                        groupByProduct: true,
                        collectionId: collection?.id,
                        facetValueFilters: facetValueIds.map(id => ({ and: id })),
                        take: perPage,
                        skip: this.currentPage * perPage,
                    },
                }).pipe(
                    tap(data => {
                        this.pageResponse.setStatus(200);
                        if (facetValueIds.length === 0) {
                            this.facetValues = data.search.facetValues;
                            this.unfilteredTotalItems = data.search.totalItems;
                        } else if (!this.facetValues) {
                            getInitialFacetValueIds();
                        } else {
                            this.facetValues = this.facetValues.map(fv => fv);
                        }
                    }),
                    map(data => ({ state: 'ready' as PageLoadState, data, loading: false })),
                    catchError(() => {
                        this.pageResponse.setStatus(503);
                        return of({ state: 'error' as PageLoadState, data: emptyResults, loading: false });
                    }),
                    startWith({
                        state: (this.currentPage === 0 ? 'loading' : 'ready') as PageLoadState,
                        data: emptyResults,
                        loading: true,
                    }),
                );
            }),
            shareReplay(1),
        );

        this.pageState$ = searchResult$.pipe(map(result => result.state));
        const queryResult$ = searchResult$.pipe(
            filter(result => !result.loading),
            map(result => result.data),
        );
        this.loading$ = searchResult$.pipe(map(result => result.loading));

        this.products$ = queryResult$.pipe(
            map(data => data.search.items),
            scan<SearchItem[], SearchItem[]>((products, page) =>
                this.currentPage === 0 ? page : products.concat(page), []),
            tap(products => {
                // Save product slugs for navigation between products
                const slugs = products.map(p => p.slug);
                this.stateService.setState('collectionProductSlugs', slugs);
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
        this.totalResults$ = queryResult$.pipe(map(data => data.search.totalItems));
        this.displayLoadMore$ = combineLatest([this.products$, this.totalResults$]).pipe(
            map(([products, totalResults]) => {
                return 0 < products.length && products.length < totalResults;
            }),
        );

        // console.log('ProductListComponent initialized', this.collection$);
    }

    retryLoad(): void {
        this.currentPage = 0;
        this.reload.next();
    }

    pad(value: number | null): string {
        return String(value ?? 0).padStart(2, '0');
    }

    goBack() {
        this.location.back();
    }

    trackByProductId(index: number, item: SearchItem) {
        return item.productId;
    }

    loadMore() {
        this.currentPage ++;
        this.refresh.next();
    }

}
