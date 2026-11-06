import { InterestEmailTheme } from '../common/generated-types';

/** Read the rendered site theme at submission time, not a potentially stale storage preference. */
export function interestEmailTheme(document: Document): InterestEmailTheme {
    const layout = document.querySelector('hgart-layout');

    return layout && !layout.classList.contains('theme-light') ? InterestEmailTheme.DARK : InterestEmailTheme.LIGHT;
}
