// url=https://www.figma.com/design/RvYcdu6Mq0miVV6YxPyby8/HG-UI-Kit?node-id=802-16420
// source=src/app/core/components/saved-toggle/saved-toggle.component.ts
// component=SavedToggleComponent
import figma from 'figma';

const instance = figma.selectedInstance;

const badge = instance.findText('3');

const count = instance.getEnum('Count', {
    '0': '0',
    n: badge.type === 'TEXT' ? badge.textContent : '0',
});

export default {
    example: figma.code`<hgart-saved-toggle [count]="${count}" (opened)="openCartDrawer()"></hgart-saved-toggle>`,
    imports: ["import { CoreModule } from './src/app/core/core.module';"],
    id: 'hgart-saved-toggle',
    metadata: { nestable: true },
};
