import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'hgart-layout-footer',
    template: '<ng-content></ng-content>',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutFooterComponent {
}
