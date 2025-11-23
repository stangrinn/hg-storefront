import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

import { SearchProductsQuery } from '../../../common/generated-types';

@Component({
    selector: 'hgart-product-card',
    templateUrl: './product-card.component.html',
    // styleUrls: ['./product-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent implements OnInit {
    @Input() product: SearchProductsQuery['search']['items'][number];

    ngOnInit() {
        console.log('Product card received:', this.product);
        
    }
}
