import { ConfigurableFocusTrap, ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Inject, Input, OnChanges, OnDestroy, Output, PLATFORM_ID } from '@angular/core';

/** Keyboard and focus lifecycle for panels that stay mounted during their closing animation. */
@Directive({ selector: '[hgartDrawerFocus]' })
export class DrawerFocusDirective implements OnChanges, OnDestroy {
    @Input() hgartDrawerFocus = false;
    @Output() drawerDismiss = new EventEmitter<void>();
    @HostBinding('attr.tabindex') readonly tabIndex = -1;

    private trap?: ConfigurableFocusTrap;
    private opener?: HTMLElement;
    private focusTimer?: ReturnType<typeof setTimeout>;

    constructor(
        private element: ElementRef<HTMLElement>,
        private traps: ConfigurableFocusTrapFactory,
        @Inject(DOCUMENT) private document: Document,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    ngOnChanges(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        if (this.hgartDrawerFocus && !this.trap && this.focusTimer === undefined) {
            // Allow visible classes, children and the previous panel's teardown to finish first.
            this.focusTimer = setTimeout(() => {
                this.focusTimer = undefined;
                if (!this.hgartDrawerFocus || this.trap) {
                    return;
                }
                const active = this.document.activeElement;
                this.opener = active instanceof HTMLElement ? active : undefined;
                this.trap = this.traps.create(this.element.nativeElement);
                if (!this.trap.focusInitialElement({ preventScroll: true })) {
                    this.element.nativeElement.focus({ preventScroll: true });
                }
            });
        } else if (!this.hgartDrawerFocus) {
            this.release();
        }
    }

    @HostListener('document:keydown.escape', ['$event'])
    dismiss(event: KeyboardEvent): void {
        if (this.hgartDrawerFocus && isPlatformBrowser(this.platformId)) {
            event.preventDefault();
            event.stopPropagation();
            this.drawerDismiss.emit();
        }
    }

    ngOnDestroy(): void {
        this.release();
    }

    private release(): void {
        if (this.focusTimer !== undefined) {
            clearTimeout(this.focusTimer);
            this.focusTimer = undefined;
        }
        if (!this.trap) {
            return;
        }
        const restore = this.element.nativeElement.contains(this.document.activeElement) ||
            this.document.activeElement === this.document.body;
        // Cancel delayed CDK refocusing as well as removing the focus anchors.
        this.trap.enabled = false;
        this.trap.destroy();
        this.trap = undefined;
        if (restore && this.opener?.isConnected) {
            this.opener.focus({ preventScroll: true });
        }
        this.opener = undefined;
    }
}
