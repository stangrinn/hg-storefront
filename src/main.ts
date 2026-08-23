import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import packageJson from '../package.json';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

console.info(`[hg-storefront] browser version ${packageJson.version}`);

platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => {
        console.log(err);
    });
