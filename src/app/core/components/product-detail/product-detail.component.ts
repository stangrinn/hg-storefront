
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { filter, map, switchMap, take, withLatestFrom } from 'rxjs/operators';

import {
    GetProductDetailQuery,
    GetProductDetailQueryVariables,
    SearchCollectionProductsQuery,
    SearchCollectionProductsQueryVariables,
    SearchProductsQuery,
    SearchProductsQueryVariables,
    RegisterPreOrderMutation,
    RegisterPreOrderMutationVariables
} from '../../../common/generated-types';
import { notNullOrUndefined } from '../../../common/utils/not-null-or-undefined';
import { FavouriteItem } from '../../providers/favourites/favourites.service';
import { DataService } from '../../providers/data/data.service';
import { NotificationService } from '../../providers/notification/notification.service';
import { StateService } from '../../providers/state/state.service';

import { SEARCH_PRODUCTS } from '../product-list/product-list.graphql';
import { GET_PRODUCT_DETAIL, SEARCH_COLLECTION_PRODUCTS } from './product-detail.graphql';
import { InterestFormValue } from '../interest-form/interest-form.component';
import { REGISTER_PREORDER } from './preorder.graphql';

type Variant = NonNullable<GetProductDetailQuery['product']>['variants'][number];
type Collection = NonNullable<GetProductDetailQuery['product']>['collections'][number];
/** Available tabs for product detail page */
type ProductTab = 'description' | 'additionalInfo';

@Component({
    selector: 'hgart-product-detail',
    templateUrl: './product-detail.component.html',
    styleUrls: ['./product-detail.component.scss', './product-detail.mobile.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit, OnDestroy {

    product: GetProductDetailQuery['product'];
    
    selectedVariant: Variant;
    breadcrumbs: Collection['breadcrumbs'] | null = null;

    /** Currently active tab */
    activeTab: ProductTab = 'description';
    
    /** Video source URL for gallery hover effect */
    videoSource: string | null = null;
    
    /** Whether the in-page interest form replaces the artwork view */
    isInterestFormOpen = false;

    /** Form submission state */
    isSubmitting = false;

    /** URL from which user navigated to this page */
    private referrerUrl: string | null = null;

    @ViewChild('relatedRow')
    private relatedRow?: ElementRef<HTMLElement>;

    /** Other artworks from the same collection */
    relatedProducts: SearchProductsQuery['search']['items'] = [];

    private sub: Subscription;

    constructor(private dataService: DataService,
        private stateService: StateService,
        private notificationService: NotificationService,
        private route: ActivatedRoute,
        private router: Router,
        private cDRef: ChangeDetectorRef,
        @Inject(PLATFORM_ID) private platformId: object) {
        // Track current URL before navigating away - save it as potential referrer
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd)
        ).subscribe((event) => {
            const currentUrl = event.urlAfterRedirects;
            
            // If we're on a non-product page, save it as referrer
            if (!currentUrl.startsWith('/product/')) {
                this.stateService.setState('productPageReferrer', currentUrl);
                console.log('Router: Saved non-product URL as referrer:', currentUrl);
            }
        });
    }

    ngOnInit() {
        const lastCollectionSlug$ = this.stateService.select(state => state.lastCollectionSlug);

        const productSlug$ = this.route.paramMap.pipe(
            map(paramMap => paramMap.get('slug')),
            filter(notNullOrUndefined),
        );

        this.sub = productSlug$.pipe(
            switchMap(slug => {
                return this.dataService.query<GetProductDetailQuery, GetProductDetailQueryVariables>(GET_PRODUCT_DETAIL, {
                    slug,
                });
            }),
            map(data => data.product),
            filter(notNullOrUndefined),
            withLatestFrom(lastCollectionSlug$, this.stateService.select(state => state.productPageReferrer)),

        ).subscribe(([product, lastCollectionSlug, savedReferrer]) => {
            this.product = product;
            
            this.selectedVariant = product.variants[0];

            // Use saved referrer from Router tracking or fallback to collection
            if (savedReferrer) {
                this.referrerUrl = savedReferrer || '/';
                // console.log('✓ Using saved referrer from Router');
            } else {
                this.referrerUrl = `/category/${product.collections[0]?.slug}`;
                // console.log('✓ Using fallback (collection page)');
            }

            
            // Extract video source from variant's featuredAsset if it's a video file
            this.videoSource = this.extractVideoSource(product);

            const collection = this.getMostRelevantCollection(product.collections, lastCollectionSlug);

            this.breadcrumbs = collection ? collection.breadcrumbs : [];

            this.loadRelatedProducts(product.id, collection?.id);

            this.openInterestFromQuery();

            this.cDRef.markForCheck();
        });

        this.sub.add(this.route.queryParamMap.pipe(
            filter(params => params.has('interest') && !!this.product),
        ).subscribe(() => {
            this.openInterestFromQuery();
            this.cDRef.markForCheck();
        }));

    }

    /** Item stored in the guest favourites for the current artwork. */
    get favouriteItem(): FavouriteItem | null {
        if (!this.product) {
            return null;
        }

        return {
            id: this.product.id,
            slug: this.product.slug,
            name: this.product.name,
            image: this.product.featuredAsset?.preview ?? null,
            collection: this.collectionName,
        };
    }

    get collectionName(): string {
        const custom = this.product?.customFields?.artCollectionName;
        const slug = this.product?.collections[0]?.slug;
        return custom || slug?.replace(/-/g, ' ') || '';
    }

    trackByProductId(index: number, item: SearchProductsQuery['search']['items'][number]) {
        return item.productId;
    }

    scrollRelated(direction: 1 | -1): void {
        const row = this.relatedRow?.nativeElement;
        if (row) {
            row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: 'smooth' });
        }
    }

    private loadRelatedProducts(productId: string, collectionId?: string): void {
        this.relatedProducts = [];
        if (!collectionId) {
            return;
        }
        this.dataService.query<SearchProductsQuery, SearchProductsQueryVariables>(SEARCH_PRODUCTS, {
            input: { collectionId, groupByProduct: true, take: 12 },
        }).pipe(take(1)).subscribe(data => {
            this.relatedProducts = data.search.items.filter(item => item.productId !== productId);
            this.cDRef.markForCheck();
        });
    }

    /**
     * Navigates to the next or previous product in the collection.
     * If collection products are not loaded, fetches them first.
     * @param next - If true, navigates to the next product; if false, to the previous one
     */
    nextOrPreviousProduct(next: boolean): void {
        this.stateService.select(state => state.collectionProductSlugs)
            .pipe(
                take(1),
                
                switchMap(() => {
                    //load products from the product's collection
                    const collection = this.getMostRelevantCollection(
                        this.product?.collections || [],
                        null
                    );
                    if (!collection) return of([]);
                    // Fetch collection products
                    return this.dataService.query<SearchCollectionProductsQuery, SearchCollectionProductsQueryVariables>(
                        SEARCH_COLLECTION_PRODUCTS,
                        { collectionId: collection.id }
                    ).pipe(
                        map(data => {
                            const productSlugs = data.search.items.map(item => item.slug);
                            // Save to state for future navigation
                            this.stateService.setState('collectionProductSlugs', productSlugs);
                            return productSlugs;
                        })
                    );
                }),
                
                filter(slugs => slugs.length > 0),

                map(slugs => this.getTargetSlug(slugs, next)),

                filter(notNullOrUndefined),
            )
            .subscribe(targetSlug => {
                console.log(`Navigating to ${next ? 'next' : 'previous'} product:`, targetSlug);
                
                this.router.navigate(['/product', targetSlug]);
                
                this.cDRef.markForCheck();
            });
    }
    
    /**
     * Navigates back to the page from which user came.
     * Falls back to the last collection or home page if referrer is unavailable.
     */
    closeProductDetails(): void {
        console.log('Closing product details, navigating to referrerUrl:', this.referrerUrl);
        
        // Clear saved referrer when leaving product pages
        this.stateService.setState('productPageReferrer', null);
        
        this.referrerUrl && this.router.navigateByUrl(this.referrerUrl);
    }

    /**
     * Checks if the URL is internal (same origin).
     * @param url - URL to check
     * @returns True if URL is internal
     */
    private isInternalUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url, window.location.origin);
            return parsedUrl.origin === window.location.origin;
        } catch {
            // If URL parsing fails, assume it's a relative path (internal)
            return true;
        }
    }

    /**
     * Calculates the target slug based on current position and direction.
     * @param slugs - Array of product slugs
     * @param next - If true, get next slug; if false, get previous
     * @returns Target slug or null
     */
    private getTargetSlug(slugs: string[], next: boolean): string | null {
        const currentSlug = this.product?.slug;
        if (!currentSlug) {
            return null;
        }

        const currentIndex = slugs.indexOf(currentSlug);

        if (currentIndex === -1) {
            return null;
        }

        const targetIndex = next ? currentIndex + 1 : currentIndex - 1;

        // Wrap around: if at the end, go to the beginning and vice versa
        if (targetIndex < 0) {
            return slugs[slugs.length - 1];
        }

        if (targetIndex >= slugs.length) {
            return slugs[0];
        }

        return slugs[targetIndex];
    }

    /**
     * If there is a collection matching the `lastCollectionId`, return that. Otherwise return the collection
     * with the longest `breadcrumbs` array, which corresponds to the most specific collection.
     */
    private getMostRelevantCollection(collections: Collection[], lastCollectionSlug: string | null) {
        const lastCollection = collections.find(c => c.slug === lastCollectionSlug);
        if (lastCollection) {
            return lastCollection;
        }
        return collections.slice().sort((a, b) => {
            if (a.breadcrumbs.length < b.breadcrumbs.length) {
                return 1;
            }
            if (a.breadcrumbs.length > b.breadcrumbs.length) {
                return -1;
            }
            return 0;
        })[0];
    }

    /**
     * Sets the active tab.
     * @param tab - Tab to activate
     */
    setActiveTab(tab: ProductTab): void {
        this.activeTab = tab;
    }

    /**
     * Returns the additional info content with priority:
     * variant's additionalInfo > product's additionalInfo.
     * @returns Additional info HTML content or null
     */
    getAdditionalInfo(): string | null {
        const variantInfo = this.selectedVariant?.customFields?.additionalInfo;
        const productInfo = this.product?.customFields?.additionalInfo;
        return variantInfo || productInfo || null;
    }

    /**
     * Checks if additional info is available for current product/variant.
     * @returns True if additional info exists
     */
    hasAdditionalInfo(): boolean {
        return !!this.getAdditionalInfo();
    }

    /**
     * Extracts video source URL from product's variant assets.
     * Looks for video files in variant's featuredAsset.
     * @param product - Product data
     * @returns Video source URL or null
     */
    private extractVideoSource(product: GetProductDetailQuery['product']): string | null {
        if (!product?.variants?.length) {
            return null;
        }
        
        // Check first variant's featuredAsset for video
        const firstVariant = product.variants[0];
        const source = firstVariant?.featuredAsset?.source;
        
        if (source && this.isVideoFile(source)) {
            return source;
        }
        
        return null;
    }

    /**
     * Checks if the source URL points to a video file.
     * @param source - Asset source URL
     * @returns True if the source is a video file
     */
    private isVideoFile(source: string): boolean {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
        const lowerSource = source.toLowerCase();
        return videoExtensions.some(ext => lowerSource.includes(ext));
    }

    /** Opens the interest form when arriving from the Saved drawer (?interest=1). */
    private openInterestFromQuery(): void {
        if (!this.route.snapshot.queryParamMap.has('interest') || this.isInterestFormOpen) {
            return;
        }

        this.openInterestForm();
        this.router.navigate([], { queryParams: { interest: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }

    /** Opens the in-page interest form. */
    openInterestForm(): void {
        this.isInterestFormOpen = true;

        if (isPlatformBrowser(this.platformId)) {
            window.scrollTo({ top: 0 });
        }

        this.cDRef.markForCheck();
    }

    /** Returns to the artwork view and resets the form. */
    closeInterestForm(): void {
        this.isInterestFormOpen = false;

        if (isPlatformBrowser(this.platformId)) {
            window.scrollTo({ top: 0 });
        }

        this.cDRef.markForCheck();
    }

    /** Sends the interest request for this artwork. */
    submitPreorder(value: InterestFormValue): void {
        if (this.isSubmitting || !this.product) {
            return;
        }

        this.isSubmitting = true;

        this.dataService.mutate<RegisterPreOrderMutation, RegisterPreOrderMutationVariables>(REGISTER_PREORDER, {
            productId: this.product.id,
            variantId: this.selectedVariant?.id,
            customerName: value.name,
            customerEmail: value.email,
            comment: value.details || undefined,
        }).subscribe({
            next: result => {
                this.isSubmitting = false;

                if (!result.registerPreOrder.success) {
                    this.notificationService.error('Failed to register interest. Please try again.').subscribe();
                    this.cDRef.markForCheck();

                    return;
                }

                this.closeInterestForm();

                this.notificationService.notify({
                    title: 'Interest Registered',
                    type: 'info',
                    duration: 5000,
                }).subscribe();

                this.cDRef.markForCheck();
            },
            error: () => {
                this.isSubmitting = false;
                this.notificationService.error('Failed to register interest. Please try again.').subscribe();
                this.cDRef.markForCheck();
            }
        });
    }

    ngOnDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
        // Note: We don't clear productPageReferrer here to preserve it for next/previous navigation
            this.referrerUrl = null;
        }
    }

}
