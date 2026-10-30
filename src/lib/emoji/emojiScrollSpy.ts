import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import { EmojiCategoryBar } from './emojiCategoryBar.js';
import { EmojiSection } from './emojiSection.js';
import { EmojiCategory } from './emojiTypes.js';

export class EmojiScrollSpy {
	private _isProgrammaticScroll: boolean = false;

	constructor(
		private readonly _scrollView: St.ScrollView,
		private readonly _sections: Map<EmojiCategory, EmojiSection>,
		private readonly _categoryBar: EmojiCategoryBar,
	) {}

	get isProgrammaticScroll(): boolean {
		return this._isProgrammaticScroll;
	}

	onScroll(): void {
		if (this._isProgrammaticScroll) return;
		const scrollValue = this._scrollView.vadjustment.value;

		let activeCategory: EmojiCategory | null = null;
		for (const [category, section] of this._sections) {
			if (!section.visible) continue;
			const box = section.get_allocation_box();
			if (box.y1 <= scrollValue + 40) {
				activeCategory = category;
			}
		}

		if (activeCategory) {
			this._categoryBar.setActiveCategory(activeCategory);
		}
	}

	scrollToCategory(category: EmojiCategory): void {
		const section = this._sections.get(category);
		if (!section) return;

		const targetY = Math.max(0, section.get_allocation_box().y1 - 6);
		this._isProgrammaticScroll = true;
		this._categoryBar.setActiveCategory(category);

		this._scrollView.vadjustment.ease(targetY, {
			duration: 180,
			mode: Clutter.AnimationMode.EASE_OUT_QUAD,
		});

		GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
			this._isProgrammaticScroll = false;
			return GLib.SOURCE_REMOVE;
		});
	}
}
