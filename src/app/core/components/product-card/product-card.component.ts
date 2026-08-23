import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnChanges,
} from '@angular/core';

import { SearchProductsQuery } from '../../../common/generated-types';

/**
 * ProductCardComponent displays a product card preview image.
 */
@Component({
    selector: 'hgart-product-card',
    templateUrl: './product-card.component.html',
    styleUrls: ['./product-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent implements OnChanges {
    @Input() product: SearchProductsQuery['search']['items'][number];

    /** Currently displayed preview image URL */
    currentImage: string;

    ngOnChanges(): void {
        if (this.product?.productAsset?.preview) {
            this.currentImage = this.product.productAsset.preview;
        }
    }
}
