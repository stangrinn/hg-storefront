import { InterestEmailTheme } from '../common/generated-types';
import { siteTheme } from './site-theme';

/** Read the rendered site theme at submission time, not a potentially stale storage preference. */
export function interestEmailTheme(document: Document): InterestEmailTheme {
    return siteTheme(document) === 'dark' ? InterestEmailTheme.DARK : InterestEmailTheme.LIGHT;
}
