import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { gql } from 'apollo-angular';
import { combineLatest, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { GetCollectionsQuery, SearchProductsQuery, SearchProductsQueryVariables } from '../../../common/generated-types';
import { DataService } from '../../providers/data/data.service';

interface CollectionWithProducts {
    collection: GetCollectionsQuery['collections']['items'][0];
    products: SearchProductsQuery['search']['items'];
}

@Component({
    selector: 'hgart-home-page',
    templateUrl: './home-page.component.html',
    styleUrls: ['./home-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {

    collectionsWithProducts$: Observable<CollectionWithProducts[]>;
    heroImage: SafeUrl;

    constructor(private dataService: DataService) {
    }

    ngOnInit(): void {
        const collections$ = this.dataService.query<GetCollectionsQuery>(GET_COLLECTIONS, {
            options: { 
                take: 50,
                sort: {
                    name: 'DESC'
                }
            },
        }).pipe(
            map(({collections}) => {
                // console.log('All collections:', collections.items);
                return collections.items.filter(c => c.parent && c.parent.id === '1');
            })
        );

        this.collectionsWithProducts$ = collections$.pipe(
            switchMap(rootCollections => {
                console.log('Root collections:', rootCollections);
                
                if (rootCollections.length === 0) {
                    return of([]);
                }
                
                // Create observables for each collection's products
                const observables = rootCollections.map(collection => 
                    this.dataService.query<SearchProductsQuery, SearchProductsQueryVariables>(SEARCH_PRODUCTS, {
                        input: {
                            collectionSlug: collection.slug,
                            groupByProduct: true,
                            take: 200,
                        }
                    }).pipe(
                        map(result => {
                            console.log(`Products for ${collection.name}:`, result.search.items);
                            return {
                                collection,
                                products: result.search.items
                            };
                        })
                    )
                );
                
                // Combine all product queries
                return combineLatest(observables);
            })
        );
        
        this.heroImage = this.getHeroImageUrl();
    }

    private getHeroImageUrl(): string {
        const {apiHost, apiPort} = environment;
        return `${apiHost}:${apiPort}/assets/preview/a2/thomas-serer-420833-unsplash__preview.jpg`;
    }

}

const GET_COLLECTIONS = gql`
    query GetCollections($options: CollectionListOptions) {
        collections(options: $options) {
            items {
                id
                name
                slug
                parent {
                    id
                    slug
                    name
                }
                featuredAsset {
                    id
                    preview
                }
            }
        }
    }
`;

const SEARCH_PRODUCTS = gql`
    query SearchProducts($input: SearchInput!) {
        search(input: $input) {
            items {
                productId
                slug
                productName
                description
                priceWithTax {
                    ... on PriceRange {
                        min
                        max
                    }
                }
                productAsset {
                    id
                    preview
                    focalPoint {
                        x
                        y
                    }
                }
            }
            totalItems
        }
    }
`;
