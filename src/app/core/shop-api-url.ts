interface ShopApiConfiguration {
    production: boolean;
    apiHost: string;
    apiPort: number;
    shopApiPath: string;
    serverApiUrl: string;
}

/** Keep browser requests on their deployed origin; API_URL is server-only. */
export function resolveShopApiUrl(config: ShopApiConfiguration, isServer: boolean, serverApiUrl?: string): string {
    const apiPath = config.shopApiPath.replace(/^\/+|\/+$/g, '');

    if (!isServer && (config.production || !config.apiHost)) {
        return `/${apiPath}/`;
    }

    const url = new URL(isServer ? serverApiUrl || config.serverApiUrl : config.apiHost);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Shop API URL must use HTTP or HTTPS.');
    }

    if (!isServer && config.apiPort) {
        url.port = String(config.apiPort);
    }

    const basePath = url.pathname.replace(/\/+$/g, '');
    // Existing deployments may provide either the backend origin or its full API endpoint.
    url.pathname = basePath.endsWith(`/${apiPath}`) ? `${basePath}/` : `${basePath}/${apiPath}/`;

    return url.toString();
}
