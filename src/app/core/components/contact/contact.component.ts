import { Location } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SendContactMessageMutation, SendContactMessageMutationVariables } from '../../../common/generated-types';
import { DataService } from '../../providers/data/data.service';
import { SEND_CONTACT_MESSAGE } from './contact.graphql';

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
export class ContactComponent implements OnDestroy {
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
                private changeDetector: ChangeDetectorRef) {
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    goBack(): void {
        this.location.back();
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

        this.isSubmitting = true;

        this.subscriptions.add(this.dataService.mutate<SendContactMessageMutation, SendContactMessageMutationVariables>(
            SEND_CONTACT_MESSAGE,
            { input: this.form.getRawValue() },
        ).subscribe({
            next: result => {
                this.isSubmitting = false;
                const response = result?.sendContactMessage;

                if (response?.success) {
                    this.feedback = 'Your message has been sent. Thank you for getting in touch.';
                    this.form.reset();
                } else {
                    this.hasError = true;
                    this.feedback = response?.errorCode === 'RATE_LIMITED'
                        ? 'Too many messages. Please try again later.'
                        : response?.errorCode === 'INVALID_INPUT'
                            ? 'Please check your details and try again.'
                            : 'We could not confirm that your message was sent. Please try again later.';
                }

                this.changeDetector.markForCheck();
            },
            error: () => {
                this.isSubmitting = false;
                this.hasError = true;
                this.feedback = 'We could not confirm that your message was sent. Please try again later.';
                this.changeDetector.markForCheck();
            },
        }));
    }
}
