import { gql } from 'apollo-angular';

export const SEND_CONTACT_MESSAGE = gql`
    mutation SendContactMessage($input: ContactMessageInput!) {
        sendContactMessage(input: $input) {
            success
            errorCode
        }
    }
`;
