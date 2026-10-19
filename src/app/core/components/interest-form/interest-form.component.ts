import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface InterestFormValue {
    name: string;
    email: string;
    /** Country, preferences and message folded into one comment. */
    details: string;
}

/**
 * "Let's Stay in Touch" interest form shared by the artwork page and the Saved interest page.
 * Expects the `--pd-*` colour tokens from its parent.
 */
@Component({
    selector: 'hgart-interest-form',
    templateUrl: './interest-form.component.html',
    styleUrls: ['./interest-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterestFormComponent {
    @Input() submitting = false;
    @Input() plural = false;
    @Output() submitted = new EventEmitter<InterestFormValue>();

    model = { name: '', email: '', country: '', preferences: '', comment: '' };
    submitAttempted = false;

    get nameError(): string {
        return this.submitAttempted && !this.model.name.trim() ? 'Name is required.' : '';
    }

    get emailError(): string {
        if (!this.submitAttempted) {
            return '';
        }

        const email = this.model.email.trim();

        if (!email) {
            return 'Email is required.';
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email address.';
    }

    get errorCount(): number {
        return [this.nameError, this.emailError].filter(Boolean).length;
    }

    submit(): void {
        this.submitAttempted = true;

        if (this.errorCount || this.submitting) {
            return;
        }

        const { name, email, country, preferences, comment } = this.model;
        const details = [
            country.trim() && `Country / region: ${country.trim()}`,
            preferences.trim() && `Preferences: ${preferences.trim()}`,
            comment.trim(),
        ].filter(Boolean).join('\n');

        this.submitted.emit({ name: name.trim(), email: email.trim(), details });
    }
}
