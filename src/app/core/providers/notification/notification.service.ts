import { Overlay, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, Injector } from '@angular/core';
import { race, timer } from 'rxjs';
import { finalize, take } from 'rxjs/operators';

import { NotificationComponent } from '../../components/notification/notification.component';

import { NOTIFICATION_OPTIONS, NotificationOptions } from './notification-types';

/**
 * This service is responsible for instantiating a ModalDialog component and
 * embedding the specified component within.
 */
@Injectable({providedIn: 'root'})
export class NotificationService {
    constructor(private overlay: Overlay,
                private injector: Injector,
                @Inject(DOCUMENT) private document: Document) {
    }

    /**
     * Display a "toast" notification.
     */
    notify(options: NotificationOptions) {
        const positionStrategy = this.overlay.position().global().top('16px').right('16px');
        const scrollStrategy = this.overlay.scrollStrategies.noop();
        const overlayRef = this.overlay.create(
            new OverlayConfig({
                scrollStrategy,
                positionStrategy,
                hasBackdrop: false,
                // The overlay lives outside hgart-layout, so it must carry the theme class itself.
                panelClass: this.document.querySelector('hgart-layout.theme-light') ? 'theme-light' : [],
            }),
        );
        const closeFn = () => {
            if (overlayRef.hasAttached()) {
                const notificationEl = overlayRef.overlayElement.querySelector('hgart-notification');
                if (notificationEl) {
                    notificationEl.classList.add('remove');
                }
                setTimeout(() => overlayRef.dispose(), 250);
            }
        };

        const portal = new ComponentPortal(
            NotificationComponent,
            null,
            this.createInjector(options, closeFn),
        );
        const notificationRef = overlayRef.attach(portal);

        return race(notificationRef.instance.close, timer(options.duration)).pipe(
            take(1),
            finalize(() => closeFn()),
        );
    }

    error(message: string) {
        return this.notify({
            title: 'An error occurred',
            message,
            duration: 10000,
            type: 'error',
        });
    }

    success(message: string) {
        return this.notify({
            title: 'Success',
            message,
            duration: 5000,
            type: 'success',
        });
    }

    info(message: string) {
        return this.notify({
            title: 'Information',
            message,
            duration: 5000,
            type: 'info',
        });
    }

    private createInjector(options: NotificationOptions, closeFn: () => void): Injector {
        options.templateContext = {
            ...options.templateContext,
            closeFn,
        };
        return Injector.create({
            parent: this.injector,
            providers: [{ provide: NOTIFICATION_OPTIONS, useValue: options }],
        });
    }
}
