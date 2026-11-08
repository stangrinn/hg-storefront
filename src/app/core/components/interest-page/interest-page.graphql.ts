import { gql } from 'apollo-angular';

export const REGISTER_INTEREST = gql`
    mutation RegisterInterest($input: RegisterInterestInput!) {
        registerInterest(input: $input) {
            success
        }
    }
`;
