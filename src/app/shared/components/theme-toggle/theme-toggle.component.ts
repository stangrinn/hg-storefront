import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'hgart-theme-toggle',
    templateUrl: './theme-toggle.component.html',
    styleUrls: ['./theme-toggle.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
    @Input() isDarkTheme = true;

    @Output() themeChanged = new EventEmitter<void>();

    get asset(): string {
        return `assets/icons/design-system/theme-solar-${this.isDarkTheme ? 'dark' : 'light'}`;
    }
}
