import { gql } from 'apollo-angular';


import { ASSET_FRAGMENT, CART_FRAGMENT, ERROR_RESULT_FRAGMENT } from '../../../common/graphql/fragments.graphql';

export const GET_PRODUCT_DETAIL = gql`
    query GetProductDetail($slug: String!) {
        product(slug: $slug) {
            id
            slug
            name
            description
            customFields {
                additionalInfo
                artCollectionName
            }
            variants {
                id
                name
                options {
                    code
                    name
                }
                price
                priceWithTax
                sku
                featuredAsset {
                    ...Asset
                }
                customFields {
                    additionalInfo
                }
            }
            featuredAsset {
                ...Asset
            }
            assets {
                ...Asset
            }
            collections {
                id
                slug
                breadcrumbs {
                    id
                    name
                    slug
                }
            }
        }
    }
    ${ASSET_FRAGMENT}
`;

export const ADD_TO_CART = gql`
    mutation AddToCart($variantId: ID!, $qty: Int!) {
        addItemToOrder(productVariantId: $variantId, quantity: $qty) {
            ...Cart
            ...ErrorResult
            ...on InsufficientStockError {
                order {
                    ...Cart
                }
            }
        }
    }
    ${CART_FRAGMENT}
    ${ERROR_RESULT_FRAGMENT}
`;

export const SEARCH_COLLECTION_PRODUCTS = gql`
    query SearchCollectionProducts($collectionId: ID!) {
        search(input: { collectionId: $collectionId, groupByProduct: true, take: 100 }) {
            items {
                slug
            }
            totalItems
        }
    }
`;
