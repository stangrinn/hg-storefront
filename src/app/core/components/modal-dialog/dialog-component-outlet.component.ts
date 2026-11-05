import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    Type,
    ViewContainerRef,
} from '@angular/core';

/**
 * A helper component used to embed a component instance into the {@link ModalDialogComponent}
 */
@Component({
    selector: 'hgart-dialog-component-outlet',
    template: ``,
})
export class DialogComponentOutletComponent<T> implements OnInit {
    @Input() component: Type<T>;
    @Output() create = new EventEmitter<T>();

    constructor(
        private viewContainerRef: ViewContainerRef,
    ) {}

    ngOnInit() {
        const componentRef = this.viewContainerRef.createComponent(this.component);
        this.create.emit(componentRef.instance);
    }
}
