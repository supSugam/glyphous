import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import type CopyousExtension from '../../extension.js';
import { SignalMethods, registerClass } from '../common/gjs.js';
import { CharacterCategoryBar } from './characterCategoryBar.js';

const BottomBarSignals = {
	'category-selected': { param_types: [GObject.TYPE_STRING] },
} as const;

@registerClass({ Signals: BottomBarSignals })
export class CharacterBottomBar extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof BottomBarSignals>['emit'];

	public readonly categoryBar: CharacterCategoryBar;

	constructor(ext: CopyousExtension) {
		super({
			style_class: 'character-bottom-bar',
			orientation: Clutter.Orientation.HORIZONTAL,
			x_expand: true,
			y_align: Clutter.ActorAlign.END,
		});

		this.categoryBar = new CharacterCategoryBar(ext);
		this.categoryBar.connect('category-selected', (_actor, cat: string) => {
			this.emit('category-selected', cat);
		});
		this.add_child(this.categoryBar);
	}

	setRecentVisible(visible: boolean): void {
		this.categoryBar.setRecentVisible(visible);
	}
}
