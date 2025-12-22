
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { filter, map, switchMap, take, withLatestFrom } from 'rxjs/operators';

import {
    AddToCartMutation,
    AddToCartMutationVariables,
    GetProductDetailQuery,
    GetProductDetailQueryVariables,
    SearchCollectionProductsQuery,
    SearchCollectionProductsQueryVariables
} from '../../../common/generated-types';
import { notNullOrUndefined } from '../../../common/utils/not-null-or-undefined';
import { DataService } from '../../providers/data/data.service';
import { NotificationService } from '../../providers/notification/notification.service';
import { StateService } from '../../providers/state/state.service';

import { ADD_TO_CART, GET_PRODUCT_DETAIL, SEARCH_COLLECTION_PRODUCTS } from './product-detail.graphql';
import { REGISTER_PREORDER } from './preorder.graphql';
import { ActiveService } from '../../providers/active/active.service';

type Variant = NonNullable<GetProductDetailQuery['product']>['variants'][number];
type Collection = NonNullable<GetProductDetailQuery['product']>['collections'][number];
/** Available tabs for product detail page */
type ProductTab = 'description' | 'additionalInfo';

/** Purchase readiness options */
interface PurchaseReadinessOption {
    value: string;
    label: string;
}

/** Preorder form data */
interface PreorderFormData {
    name: string;
    email: string;
    whatsapp: string;
    purchaseReadiness: string;
    comment: string;
}

@Component({
    selector: 'hgart-product-detail',
    templateUrl: './product-detail.component.html',
    styleUrls: ['./product-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit, OnDestroy {

    product: GetProductDetailQuery['product'];
    
    qtyInCart: { [id: string]: number; } = {};
    selectedVariant: Variant;
    qty = 1;
    breadcrumbs: Collection['breadcrumbs'] | null = null;
    inFlight = false;

    /** Currently active tab */
    activeTab: ProductTab = 'description';
    
    /** Video source URL for gallery hover effect */
    videoSource: string | null = null;
    
    /** Preorder modal visibility */
    isPreorderModalOpen = false;
    
    /** Preorder form data */
    preorderForm: PreorderFormData = {
        name: '',
        email: '',
        whatsapp: '',
        purchaseReadiness: '',
        comment: ''
    };
    
    /** Purchase readiness dropdown options */
    purchaseReadinessOptions: PurchaseReadinessOption[] = [
        { value: 'ready', label: 'Ready to buy now' },
        { value: 'soon', label: 'Planning to buy soon' },
        { value: 'interested', label: 'Just interested' },
        { value: 'gift', label: 'Looking for a gift' }
    ];
    
    /** Form submission state */
    isSubmitting = false;

    /** URL from which user navigated to this page */
    private referrerUrl: string | null = null;

    @ViewChild('addedToCartTemplate', { static: true })
    private addToCartTemplate: TemplateRef<unknown>;
    private sub: Subscription;

    constructor(private dataService: DataService,
        private stateService: StateService,
        private notificationService: NotificationService,
        private activeService: ActiveService,
        private route: ActivatedRoute,
        private router: Router,
        private cDRef: ChangeDetectorRef) {
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
            withLatestFrom(lastCollectionSlug$),

        ).subscribe(([product, lastCollectionSlug]) => {
            this.product = product;
            
            this.selectedVariant = product.variants[0];

            this.referrerUrl = `/category/${product.collections[0]?.slug}`;
            
            // Extract video source from variant's featuredAsset if it's a video file
            this.videoSource = this.extractVideoSource(product);
            
            console.log('lastCollectionSlug:', lastCollectionSlug, document.referrer);

            const collection = this.getMostRelevantCollection(product.collections, lastCollectionSlug);

            this.breadcrumbs = collection ? collection.breadcrumbs : [];

            this.cDRef.markForCheck();
        });

        this.activeService.activeOrder$.subscribe(order => {
            
            this.qtyInCart = {};

            for (const line of order?.lines ?? []) {
                this.qtyInCart[line.productVariant.id] = line.quantity;
            }
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

    addToCart(variant: Variant, qty: number) {
        this.inFlight = true;
        this.dataService.mutate<AddToCartMutation, AddToCartMutationVariables>(ADD_TO_CART, {
            variantId: variant.id,
            qty,
        }).subscribe(({ addItemToOrder }) => {
            this.inFlight = false;
            switch (addItemToOrder.__typename) {
                case 'Order':
                    this.stateService.setState('activeOrderId', addItemToOrder ? addItemToOrder.id : null);
                    if (variant) {
                        this.notificationService.notify({
                            title: 'Added to cart',
                            type: 'info',
                            duration: 3000,
                            templateRef: this.addToCartTemplate,
                            templateContext: {
                                variant,
                                quantity: qty,
                            },
                        }).subscribe();
                    }
                    break;
                case 'OrderModificationError':
                case 'OrderLimitError':
                case 'NegativeQuantityError':
                case 'InsufficientStockError':
                    this.notificationService.error(addItemToOrder.message).subscribe();
                    break;
            }

        });
    }

    viewCartFromNotification(closeFn: () => void) {
        this.stateService.setState('cartDrawerOpen', true);
        closeFn();
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

    /**
     * Opens the preorder modal.
     */
    openPreorderModal(): void {
        this.isPreorderModalOpen = true;
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    /**
     * Closes the preorder modal and resets form.
     */
    closePreorderModal(): void {
        this.isPreorderModalOpen = false;
        document.body.style.overflow = '';
        this.resetPreorderForm();
    }

    /**
     * Resets the preorder form to initial state.
     */
    private resetPreorderForm(): void {
        this.preorderForm = {
            name: '',
            email: '',
            whatsapp: '',
            purchaseReadiness: '',
            comment: ''
        };
    }

    /**
     * Validates the preorder form.
     * @returns True if form is valid
     */
    isPreorderFormValid(): boolean {
        return !!(this.preorderForm.name.trim() && this.preorderForm.email.trim());
    }

    /**
     * Submits the preorder form.
     */
    submitPreorder(): void {
        if (!this.isPreorderFormValid() || this.isSubmitting) return;
        
        this.isSubmitting = true;

        // Send preorder to Vendure backend
        this.dataService.mutate(REGISTER_PREORDER, {
            productId: this.product?.id,
            variantId: this.selectedVariant?.id,
            customerName: this.preorderForm.name,
            customerEmail: this.preorderForm.email,
            whatsapp: this.preorderForm.whatsapp || null,
            purchaseReadiness: this.preorderForm.purchaseReadiness || null,
            comment: this.preorderForm.comment || null,
        }).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.closePreorderModal();
                this.notificationService.notify({
                    title: 'Interest Registered',
                    type: 'info',
                    duration: 5000,
                }).subscribe();
            },
            error: (error) => {
                this.isSubmitting = false;
                console.error('Preorder submission failed:', error);
                this.notificationService.error('Failed to register interest. Please try again.').subscribe();
            }
        });
    }

    /**
     * Handles click on modal backdrop to close modal.
     * @param event - Click event
     */
    onModalBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('preorder-modal-overlay')) {
            this.closePreorderModal();
        }
    }

    ngOnDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
            this.referrerUrl = null;
        }
        // Ensure body scroll is restored
        document.body.style.overflow = '';
    }

}
