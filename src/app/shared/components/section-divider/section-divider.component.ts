import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

export type SectionDividerVariant = 'diagonal' | 'gradient' | 'overlap' | 'wave' | 'texture' | 'sash';

/**
 * Decorative separator between page sections (Figma: Main 1920 → divider-*).
 */
@Component({
    selector: 'hgart-section-divider',
    templateUrl: './section-divider.component.html',
    styleUrls: ['./section-divider.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionDividerComponent {
    @Input() variant: SectionDividerVariant = 'diagonal';

    @HostBinding('attr.aria-hidden') readonly ariaHidden = 'true';

    @HostBinding('attr.data-variant') get dataVariant(): SectionDividerVariant {
        return this.variant;
    }
}
