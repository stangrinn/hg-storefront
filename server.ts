import { APP_BASE_HREF } from '@angular/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import 'zone.js/node';

import { AppServerModule } from './src/main.server';

function readAppVersion(): string {
    try {
        const packageJsonPath = join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {version?: string};
        return packageJson.version || 'unknown';
    } catch (err) {
        return 'unknown';
    }
}

// The Express app is exported so that it can be used by serverless Functions.
export function app() {
    const server = express();

    const distFolder = join(process.cwd(), 'dist/browser');
    const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

    // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
    server.engine('html', ngExpressEngine({
        bootstrap: AppServerModule,
    }) as any);

    server.set('view engine', 'html');
    server.set('views', distFolder);

    // Serve static files from /browser
    server.get('*.*', express.static(distFolder, {
        maxAge: '1y',
    }));

    // All regular routes use the Universal engine
    server.get('*', (req, res) => {
        // Skip SSR for static files
        if (req.url.includes('.')) {
            return res.status(404).send('Not found');
        }
        res.render(indexHtml, {req, providers: [{provide: APP_BASE_HREF, useValue: req.baseUrl}]});
    });

    return server;
}

function run() {
    const port = process.env.PORT || 4000;
    const version = readAppVersion();

    // Start up the Node server
    const server = app();
    server.listen(port, () => {
        console.log(`Node Express server listening on http://localhost:${port}`);
        console.log(`[hg-storefront] server version ${version}`);
    });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
    run();
}

export * from './src/main.server';
