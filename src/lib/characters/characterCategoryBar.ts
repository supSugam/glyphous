import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import type CopyousExtension from '../../extension.js';
import { SignalMethods, registerClass } from '../common/gjs.js';
import { loadIcon } from '../common/icons.js';
import { CHARACTER_CATEGORY_DEFINITIONS, CharacterCategory } from './characterTypes.js';

const CategoryBarSignals = {
	'category-selected': {
		param_types: [GObject.TYPE_STRING],
	},
} as const;

@registerClass({
	Signals: CategoryBarSignals,
})
export class CharacterCategoryBar extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof CategoryBarSignals>['emit'];

	private readonly _buttons: Map<CharacterCategory, St.Button> = new Map();
	private _activeCategory: CharacterCategory = CharacterCategory.Recent;

	constructor(private readonly _ext: CopyousExtension) {
		super({
			orientation: Clutter.Orientation.HORIZONTAL,
			style_class: 'character-category-bar',
			x_expand: true,
			y_align: Clutter.ActorAlign.CENTER,
		});

		for (const def of CHARACTER_CATEGORY_DEFINITIONS) {
			const button = new St.Button({
				style_class: 'character-category-button',
				can_focus: true,
				track_hover: true,
				x_expand: true,
				accessible_name: def.label,
				child: new St.Icon({
					gicon: loadIcon(this._ext, def.icon),
					style_class: 'character-category-icon',
					x_align: Clutter.ActorAlign.CENTER,
					y_align: Clutter.ActorAlign.CENTER,
				}),
			});

			button.connect('clicked', () => {
				this.setActiveCategory(def.id);
				this.emit('category-selected', def.id);
			});

			this._buttons.set(def.id, button);
			this.add_child(button);
		}

		this.setActiveCategory(CharacterCategory.Punctuation);
	}

	get activeCategory(): CharacterCategory {
		return this._activeCategory;
	}

	setRecentVisible(visible: boolean): void {
		const recentButton = this._buttons.get(CharacterCategory.Recent);
		if (recentButton) {
			recentButton.visible = visible;
			if (!visible && this._activeCategory === CharacterCategory.Recent) {
				this.setActiveCategory(CharacterCategory.Punctuation);
			}
		}
	}

	setActiveCategory(category: CharacterCategory): void {
		if (this._activeCategory === category && this._buttons.get(category)?.checked) return;
		this._activeCategory = category;

		for (const [id, button] of this._buttons) {
			const isActive = id === category;
			button.checked = isActive;
			if (isActive) {
				button.add_style_class_name('active');
			} else {
				button.remove_style_class_name('active');
			}
		}
	}
}
