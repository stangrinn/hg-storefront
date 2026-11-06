export type SiteTheme = 'dark' | 'light';

/** Reads the theme the site is currently rendered with (dark is the default, light adds `theme-light` to the layout). */
export function siteTheme(document: Document): SiteTheme {
    const layout = document.querySelector('hgart-layout');

    return layout && !layout.classList.contains('theme-light') ? 'dark' : 'light';
}
