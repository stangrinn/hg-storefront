export const environment = {
    production: true,
    apiHost: typeof process !== 'undefined' && process.env?.['API_URL'] 
        ? process.env['API_URL'].replace(/:\d+$/, '') 
        : 'http://backend',
    apiPort: typeof process !== 'undefined' && process.env?.['API_URL']
        ? parseInt(process.env['API_URL'].match(/:(\d+)$/)?.[1] || '3000')
        : 3000,
    shopApiPath: 'shop-api',
    baseHref: '/',
    tokenMethod: 'bearer',
};
