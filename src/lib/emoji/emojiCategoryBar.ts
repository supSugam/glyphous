import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { CATEGORY_DEFINITIONS, EmojiCategory } from './emojiTypes.js';

const EmojiCategoryBarSignals = {
	'category-selected': {
		param_types: [GObject.TYPE_STRING],
	},
} as const;

@registerClass({
	Signals: EmojiCategoryBarSignals,
})
export class EmojiCategoryBar extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof EmojiCategoryBarSignals>['emit'];

	private readonly _buttons: Map<EmojiCategory, St.Button> = new Map();
	private _activeCategory: EmojiCategory = EmojiCategory.Recent;

	constructor() {
		super({
			orientation: Clutter.Orientation.HORIZONTAL,
			style_class: 'emoji-category-bar',
			x_expand: true,
			y_align: Clutter.ActorAlign.CENTER,
		});

		for (const def of CATEGORY_DEFINITIONS) {
			const button = new St.Button({
				style_class: 'emoji-category-button',
				can_focus: true,
				track_hover: true,
				x_expand: true,
				accessible_name: def.label,
				child: new St.Icon({
					icon_name: def.icon,
					style_class: 'emoji-category-icon',
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

		this.setActiveCategory(EmojiCategory.Smileys);
	}

	get activeCategory(): EmojiCategory {
		return this._activeCategory;
	}

	setRecentVisible(visible: boolean): void {
		const recentButton = this._buttons.get(EmojiCategory.Recent);
		if (recentButton) {
			recentButton.visible = visible;
			if (!visible && this._activeCategory === EmojiCategory.Recent) {
				this.setActiveCategory(EmojiCategory.Smileys);
			}
		}
	}

	setActiveCategory(category: EmojiCategory): void {
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
