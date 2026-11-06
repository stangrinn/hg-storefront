import { DOCUMENT, isPlatformBrowser, Location } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SendContactMessageMutation, SendContactMessageMutationVariables } from '../../../common/generated-types';
import { DataService } from '../../providers/data/data.service';
import { SEND_CONTACT_MESSAGE } from './contact.graphql';
import { environment } from '../../../../environments/environment';

interface TurnstileApi {
    render(container: HTMLElement, options: {
        sitekey: string;
        action: string;
        size: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
    }): string;
    reset(id: string): void;
    remove(id: string): void;
}

interface PreorderFaq {
    question: string;
    answer: string;
}

@Component({
    selector: 'hgart-contact',
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent implements AfterViewInit, OnDestroy {
    @ViewChild('captcha', { static: true }) private captcha: ElementRef<HTMLElement>;

    @ViewChild('resultDialog', { static: true }) private resultDialog: ElementRef<HTMLDialogElement>;

    readonly successMessage = 'Thank you for your message. We’ll respond as soon as possible.';

    readonly failureMessage = 'Unfortunately, your message could not be sent. Please try again later.';

    captchaToken = '';

    captchaError = '';

    private widgetId?: string;

    private captchaTimer?: ReturnType<typeof setInterval>;

    private destroyed = false;

    private get turnstile(): TurnstileApi | undefined {
        return (this.document.defaultView as (Window & { turnstile?: TurnstileApi }) | null)?.turnstile;
    }

    isSubmitting = false;

    feedback = '';

    hasError = false;

    private readonly subscriptions = new Subscription();

    readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/.*\S.*/)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
        subject: ['', Validators.maxLength(200)],
        message: ['', [Validators.required, Validators.maxLength(5000), Validators.pattern(/[\s\S]*\S[\s\S]*/)]],
        website: [''],
    });

    readonly faq: PreorderFaq[] = [
        {
            question: 'What does preorder mean?',
            answer: 'Preorder means you\'re registering interest in a piece before it is released. You\'re not making a final purchase yet - you\'re helping me understand demand so I can plan the first edition run.',
        },
        {
            question: 'When will I receive my artwork?',
            answer: 'Once the preorder window closes, I\'ll confirm availability, pricing, and timing with everyone who has expressed interest. If you decide to move forward, you\'ll receive your artwork after production is complete and the first editions are ready to ship.',
        },
        {
            question: 'Is my preorder a commitment?',
            answer: 'No. Preordering is a non-binding way to express interest. You\'ll receive updates as the collection moves forward, and you can decide whether to proceed with a purchase once details are confirmed.',
        },
    ];

    constructor(private fb: FormBuilder,
                private location: Location,
                private dataService: DataService,
                private changeDetector: ChangeDetectorRef,
                private zone: NgZone,
                @Inject(DOCUMENT) private document: Document,
                @Inject(PLATFORM_ID) private platformId: object) {
    }

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (!this.document.getElementById('contact-turnstile-script')) {
            const script = this.document.createElement('script');
            script.id = 'contact-turnstile-script';
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            this.document.head.appendChild(script);
        }

        const update = (token: string, error = '') => this.zone.run(() => {
            if (!this.destroyed) {
                this.captchaToken = token;
                this.captchaError = error;
                this.changeDetector.markForCheck();
            }
        });
        const deadline = Date.now() + 15000;

        this.zone.runOutsideAngular(() => {
            this.captchaTimer = setInterval(() => {
                const api = this.turnstile;

                if (!api) {
                    if (Date.now() >= deadline) {
                        this.stopCaptchaTimer();
                        update('', 'Verification could not load. Please reload the page to try again.');
                    }

                    return;
                }

                this.stopCaptchaTimer();

                try {
                    this.widgetId = api.render(this.captcha.nativeElement, {
                        sitekey: environment.turnstileSiteKey,
                        action: 'contact',
                        size: 'flexible',
                        callback: token => update(token),
                        'expired-callback': () => update('', 'Verification expired. Please complete it again.'),
                        'error-callback': () => update('', 'Verification failed. Please try again or reload the page.'),
                    });
                } catch {
                    update('', 'Verification could not load. Please reload the page to try again.');
                }
            }, 100);
        });
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.closeResult();
        this.stopCaptchaTimer();

        if (this.widgetId !== undefined) {
            this.turnstile?.remove(this.widgetId);
        }

        this.subscriptions.unsubscribe();
    }

    private stopCaptchaTimer(): void {
        if (this.captchaTimer !== undefined) {
            clearInterval(this.captchaTimer);
            this.captchaTimer = undefined;
        }
    }

    private resetCaptcha(): void {
        this.captchaToken = '';

        if (this.widgetId !== undefined) {
            this.turnstile?.reset(this.widgetId);
        }
    }

    goBack(): void {
        this.location.back();
    }

    closeResult(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.resultDialog.nativeElement.close();
        }
    }

    closeResultOnBackdrop(event: MouseEvent): void {
        const dialog = this.resultDialog.nativeElement;
        const bounds = dialog.getBoundingClientRect();

        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom)) {
            this.closeResult();
        }
    }

    private showResult(): void {
        if (!this.destroyed && isPlatformBrowser(this.platformId)) {
            this.changeDetector.detectChanges();
            this.resultDialog.nativeElement.showModal();
        }
    }

    fieldError(field: 'name' | 'email' | 'subject' | 'message'): string {
        const control = this.form.controls[field];

        if (!control.touched) {
            return '';
        }

        if (control.hasError('required') || control.hasError('pattern')) {
            return 'Please fill in this field.';
        }

        if (control.hasError('maxlength')) {
            return 'This field is too long.';
        }

        return control.hasError('email') ? 'Please enter a valid email address.' : '';
    }

    submit(): void {
        if (this.isSubmitting) {
            return;
        }

        this.feedback = '';
        this.hasError = false;

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        if (!this.captchaToken) {
            this.captchaError = 'Please complete the verification before sending.';

            return;
        }

        this.isSubmitting = true;

        this.subscriptions.add(this.dataService.mutate<SendContactMessageMutation, SendContactMessageMutationVariables>(
            SEND_CONTACT_MESSAGE,
            { input: { ...this.form.getRawValue(), captchaToken: this.captchaToken } },
        ).subscribe({
            next: result => {
                this.isSubmitting = false;
                this.resetCaptcha();
                const response = result?.sendContactMessage;

                if (response?.success) {
                    this.feedback = this.successMessage;
                    this.form.reset();
                } else {
                    this.hasError = true;
                    this.feedback = response?.errorCode === 'RATE_LIMITED'
                        ? 'Too many messages. Please try again later.'
                        : response?.errorCode === 'CAPTCHA_FAILED'
                            ? 'Verification failed or expired. Please complete it again and retry.'
                        : response?.errorCode === 'INVALID_INPUT'
                            ? 'Please check your details and try again.'
                            : this.failureMessage;
                }

                this.showResult();
            },
            error: () => {
                this.isSubmitting = false;
                this.resetCaptcha();
                this.hasError = true;
                this.feedback = this.failureMessage;
                this.showResult();
            },
        }));
    }
}
