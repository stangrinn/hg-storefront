import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'hgart-saved-toggle',
    templateUrl: './saved-toggle.component.html',
    styleUrls: ['./saved-toggle.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedToggleComponent {
    @Input() count: number | null = 0;
    @Input() collectionStyle: boolean | null = false;

    @Output() opened = new EventEmitter<void>();
}
