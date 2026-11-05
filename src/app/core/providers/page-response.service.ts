import { Inject, Injectable, Optional } from '@angular/core';
import { RESPONSE } from '@nguniversal/express-engine/tokens';
import { Response } from 'express';

export type PageLoadState = 'loading' | 'ready' | 'not-found' | 'error';

@Injectable({ providedIn: 'root' })
export class PageResponseService {
    constructor(@Optional() @Inject(RESPONSE) private response: Response | null) {}

    setStatus(status: 200 | 404 | 503): void {
        if (this.response && !this.response.headersSent) {
            this.response.status(status);
        }
    }
}
