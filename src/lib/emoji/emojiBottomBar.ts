import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { EmojiCategoryBar } from './emojiCategoryBar.js';
import { EmojiSkinToneSelector } from './emojiSkinToneSelector.js';
import { EmojiCategory, SkinTone } from './emojiTypes.js';

const BottomBarSignals = {
	'category-selected': { param_types: [GObject.TYPE_STRING] },
	'tone-changed': { param_types: [GObject.TYPE_INT] },
	'toggle-popup': {},
} as const;

@registerClass({ Signals: BottomBarSignals })
export class EmojiBottomBar extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof BottomBarSignals>['emit'];

	public readonly categoryBar: EmojiCategoryBar;
	public readonly toneSelector: EmojiSkinToneSelector;

	constructor() {
		super({
			orientation: Clutter.Orientation.HORIZONTAL,
			style_class: 'emoji-bottom-bar',
			x_expand: true,
		});

		this.categoryBar = new EmojiCategoryBar();
		this.categoryBar.connect('category-selected', (_actor, cat: string) => {
			this.emit('category-selected', cat);
		});
		this.add_child(this.categoryBar);

		this.toneSelector = new EmojiSkinToneSelector();
		this.toneSelector.connect('toggle-popup', () => this.emit('toggle-popup'));
		this.toneSelector.connect('tone-changed', (_actor, tone: number) => {
			this.emit('tone-changed', tone);
		});
		this.add_child(this.toneSelector);
	}

	get tone(): SkinTone {
		return this.toneSelector.tone;
	}

	selectTone(tone: SkinTone): void {
		this.toneSelector.selectTone(tone);
	}

	setRecentVisible(visible: boolean): void {
		this.categoryBar.setRecentVisible(visible);
	}

	setActiveCategory(category: EmojiCategory): void {
		this.categoryBar.setActiveCategory(category);
	}
}
