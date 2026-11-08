import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';

@Component({
    selector: 'hgart-interest-result',
    templateUrl: './interest-result.component.html',
    styleUrls: ['./interest-result.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterestResultComponent implements OnDestroy {
    @ViewChild('dialog', { static: true }) private dialog: ElementRef<HTMLDialogElement>;

    success = false;

    message = '';

    constructor(private changeDetector: ChangeDetectorRef,
                @Inject(PLATFORM_ID) private platformId: object) {}

    show(success: boolean, message: string): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.success = success;
        this.message = message;
        this.changeDetector.detectChanges();
        this.dialog.nativeElement.showModal();
    }

    close(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.dialog.nativeElement.close();
        }
    }

    backdropClick(event: MouseEvent): void {
        const dialog = this.dialog.nativeElement;
        const bounds = dialog.getBoundingClientRect();

        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom)) {
            this.close();
        }
    }

    ngOnDestroy(): void {
        this.close();
    }
}
