import { isPlatformBrowser } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { FactoryProvider, Optional, PLATFORM_ID, makeStateKey, TransferState } from '@angular/core';
import { ApolloClientOptions, ApolloLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core';
import { REQUEST } from '@nguniversal/express-engine/tokens';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink, Options } from 'apollo-angular/http';
import { Request } from 'express';

import { environment } from '../../environments/environment';
import possibleTypesResult from '../common/introspection-results';
import { resolveShopApiUrl } from './shop-api-url';

const STATE_KEY = makeStateKey<NormalizedCacheObject | null>('apollo.state');

export const APOLLO_CLIENT_PROVIDER: FactoryProvider = {
    provide: APOLLO_OPTIONS,
    useFactory: apolloOptionsFactory,
    deps: [HttpLink, PLATFORM_ID, TransferState, [new Optional(), REQUEST]],
};

function mergeFields(existing: Readonly<Record<string, unknown>> | undefined, incoming: Readonly<Record<string, unknown>>) {
    return {...existing, ...incoming};
}

function relaceFields<T>(existing: T | undefined, incoming: T) {
    return incoming;
}

// Trying to debug why sessions won't work in Safari 13.1
// but only on the live prod version.
function logInterceptorData(on: boolean) {
    localStorage.setItem('_logInterceptorData', on ? 'true' : 'false');
}

if (typeof window !== 'undefined') {
    (window as Window & { logInterceptorData?: typeof logInterceptorData }).logInterceptorData = logInterceptorData;
}

export function apolloOptionsFactory(
    httpLink: HttpLink,
    platformId: object,
    transferState: TransferState,
    req?: Request,
): ApolloClientOptions<NormalizedCacheObject> {
    const AUTH_TOKEN_KEY = 'auth_token';
    const apolloCache = new InMemoryCache({
        possibleTypes: possibleTypesResult.possibleTypes,
        typePolicies: {
            Query: {
                fields: {
                    eligibleShippingMethods: {
                        merge: relaceFields,
                    },
                },
            },
            Product: {
                fields: {
                    customFields: {
                        merge: mergeFields,
                    },
                },
            },
            Collection: {
                fields: {
                    customFields: {
                        merge: mergeFields,
                    },
                },
            },
            Order: {
                fields: {
                    lines: {
                        merge: relaceFields,
                    },
                    shippingLines: {
                        merge: relaceFields,
                    },
                    discounts: {
                        merge: relaceFields,
                    },
                    shippingAddress: {
                        merge: relaceFields,
                    },
                    billingAddress: {
                        merge: relaceFields,
                    },
                },
            },
            Customer: {
                fields: {
                    addresses: {
                        merge: relaceFields,
                    },
                    customFields: {
                        merge: mergeFields,
                    },
                },
            },
        },
    });

    const isServer = !isPlatformBrowser(platformId);
    const serverApiUrl = isServer && typeof process !== 'undefined' ? process.env?.['API_URL'] : undefined;
    const uri = resolveShopApiUrl(environment, isServer, serverApiUrl);

    const options: Options = {
        uri,
        withCredentials: false,
    };

    const http = httpLink.create(options);
    const afterware = new ApolloLink((operation, forward) => {
        return forward(operation).map((response) => {
            const context = operation.getContext();
            const authHeader = context.response.headers.get('vendure-auth-token');
            if (authHeader && isPlatformBrowser(platformId)) {
                // If the auth token has been returned by the Vendure
                // server, we store it in localStorage
                localStorage.setItem(AUTH_TOKEN_KEY, authHeader);
            }
            return response;
        });
    });
    const middleware = new ApolloLink((operation, forward) => {
        if (isPlatformBrowser(platformId)) {
            operation.setContext({
                headers: new HttpHeaders().set(
                    'Authorization',
                    `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY) || null}`,
                ),
            });
        }
        return forward(operation);
    });

    if (isServer) {
        transferState.onSerialize(STATE_KEY, () => apolloCache.extract());
    } else if (transferState.hasKey(STATE_KEY)) {
        const state = transferState.get(STATE_KEY, null);
        if (state) {
            apolloCache.restore(state);
        }
        transferState.remove(STATE_KEY);
    }

    return {
        cache: apolloCache,
        ssrMode: isServer,
        ssrForceFetchDelay: 500,
        link: ApolloLink.from([middleware, afterware, http]),
    };
}
