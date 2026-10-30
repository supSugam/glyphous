import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { EmojiDataManager } from './emojiData.js';
import { EmojiSection } from './emojiSection.js';
import { CATEGORY_DEFINITIONS, DEFAULT_EMOJI_COLUMNS, EmojiCategory, EmojiRecord, SkinTone } from './emojiTypes.js';

const Signals = {
	'emoji-selected': { param_types: [GObject.TYPE_STRING] },
	'emoji-activated': { param_types: [GObject.TYPE_STRING] },
	'clear-recents': {},
} as const;

@registerClass({ Signals })
export class EmojiSectionsContainer extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof Signals>['emit'];

	public readonly sections: Map<EmojiCategory, EmojiSection> = new Map();
	private _columns: number = DEFAULT_EMOJI_COLUMNS;
	private _spacing: number = 3;

	constructor(dataManager: EmojiDataManager, recentRecords: EmojiRecord[]) {
		super({ vertical: true, style_class: 'emoji-continuous-box', x_expand: true });

		for (const { id, label } of CATEGORY_DEFINITIONS) {
			const isRecent = id === EmojiCategory.Recent;
			const records = isRecent ? recentRecords : dataManager.getEmojisByCategory(id);
			const section = new EmojiSection(id, label, records);
			section.connect('emoji-selected', (_actor, emoji: string) => this.emit('emoji-selected', emoji));
			section.connect('emoji-activated', (_actor, emoji: string) => this.emit('emoji-activated', emoji));
			section.connect('clear-recents', () => this.emit('clear-recents'));
			this.sections.set(id, section);
			this.add_child(section);
		}
	}

	mountInitial(tone: SkinTone, columns: number = DEFAULT_EMOJI_COLUMNS, spacing: number = 3): void {
		this._columns = columns;
		this._spacing = spacing;
		this.sections.get(EmojiCategory.Recent)?.ensureMounted(tone, this._columns, this._spacing);
		this.sections.get(EmojiCategory.Smileys)?.ensureMounted(tone, this._columns, this._spacing);
		this.mountRemaining(tone);
	}

	ensureCategoryMounted(category: EmojiCategory, tone: SkinTone): void {
		this.sections.get(category)?.ensureMounted(tone, this._columns, this._spacing);
	}

	mountRemaining(tone: SkinTone): void {
		const categories = Array.from(this.sections.keys());
		let idx = 0;
		GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
			const cat = categories[idx++];
			if (cat) {
				const section = this.sections.get(cat);
				if (section && !section.isMounted) {
					section.ensureMounted(tone, this._columns, this._spacing);
				}
			}
			return idx < categories.length ? GLib.SOURCE_CONTINUE : GLib.SOURCE_REMOVE;
		});
	}

	updateGridMetrics(columns: number, spacing: number, tone: SkinTone): void {
		this._columns = columns;
		this._spacing = spacing;
		for (const section of this.sections.values()) {
			if (section.isMounted) section.ensureMounted(tone, this._columns, this._spacing);
		}
	}

	updateSkinTone(tone: SkinTone): void {
		for (const section of this.sections.values()) section.updateSkinTone(tone);
	}

	updateRecentRecords(
		recentRecords: EmojiRecord[],
		tone: SkinTone,
		columns: number = DEFAULT_EMOJI_COLUMNS,
		spacing: number = 3,
	): void {
		this._columns = columns;
		this._spacing = spacing;
		this.sections.get(EmojiCategory.Recent)?.setRecords(recentRecords, tone, this._columns, this._spacing);
	}
}
