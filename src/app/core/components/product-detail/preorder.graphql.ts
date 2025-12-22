import { gql } from 'apollo-angular';

export const REGISTER_PREORDER = gql`
    mutation RegisterPreOrder(
        $productId: ID!
        $variantId: ID
        $customerName: String!
        $customerEmail: String!
        $whatsapp: String
        $purchaseReadiness: String
        $comment: String
    ) {
        registerPreOrder(
            productId: $productId
            variantId: $variantId
            customerName: $customerName
            customerEmail: $customerEmail
            whatsapp: $whatsapp
            purchaseReadiness: $purchaseReadiness
            comment: $comment
        ) {
            id
            code
            state
            createdAt
            customer {
                firstName
                lastName
                emailAddress
            }
        }
    }
`;
