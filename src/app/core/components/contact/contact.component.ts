import { isPlatformBrowser, Location } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

interface PreorderFaq {
    question: string;
    answer: string;
}

const CONTACT_EMAIL = 'hello@helenagrinshpun.art';

@Component({
    selector: 'hgart-contact',
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss'],
})
export class ContactComponent {
    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        subject: [''],
        message: ['', Validators.required],
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
                @Inject(PLATFORM_ID) private platformId: object) {
    }

    goBack(): void {
        this.location.back();
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const { name, email, subject, message } = this.form.getRawValue();
        const body = `${message}\n\n${name} <${email}>`;

        if (isPlatformBrowser(this.platformId)) {
            window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject || 'Inquiry from the website')}&body=${encodeURIComponent(body)}`;
        }
    }
}
