import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'hgart-layout-header',
    template: `<div class="floating-container"><ng-content></ng-content></div>`,
    styleUrls: ['./layout-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutHeaderComponent {}
