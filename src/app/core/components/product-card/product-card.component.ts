import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges } from '@angular/core';

import { SearchProductsQuery } from '../../../common/generated-types';

/**
 * ProductCardComponent displays a product card with hover animation support.
 * On hover, switches from preview image to source (e.g., animated GIF).
 */
@Component({
    selector: 'hgart-product-card',
    templateUrl: './product-card.component.html',
    styleUrls: ['./product-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent implements OnChanges {
    @Input() product: SearchProductsQuery['search']['items'][number];

    /** Currently displayed image URL */
    currentImage: string;

    hoverImage = '';

    constructor(private el: ElementRef) {}

    ngOnChanges(): void {
        if (this.product?.productAsset?.preview) {
            this.currentImage = this.product.productAsset.preview;
        }
    }

    /**
     * Switches to the source image (e.g., animated GIF) on mouse hover.
     * Uses the source URL from productAsset which is now available in the search query.
     */
    onMouseOver(): void {
        const source = this.product?.productVariantAsset?.source;
        
       if (!source) return;

       this.hoverImage = source + '?reload=' + new Date().getTime();
    }

    /**
     * Switches back to the preview image on mouse out.
     */
    onMouseOut(): void {
        if (this.product?.productAsset?.preview) {
            this.hoverImage = '';
        }
    }
}
