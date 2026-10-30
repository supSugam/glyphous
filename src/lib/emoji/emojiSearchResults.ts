import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { EmojiButton } from './emojiButton.js';
import { DEFAULT_EMOJI_COLUMNS, EmojiRecord, SkinTone } from './emojiTypes.js';

const SearchResultsSignals = {
	'emoji-selected': { param_types: [GObject.TYPE_STRING] },
	'emoji-activated': { param_types: [GObject.TYPE_STRING] },
} as const;

@registerClass({ Signals: SearchResultsSignals })
export class EmojiSearchResults extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof SearchResultsSignals>['emit'];

	private readonly _label: St.Label;
	private readonly _gridBox: St.BoxLayout;

	constructor() {
		super({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'emoji-search-results',
			x_expand: true,
			visible: false,
		});

		this._label = new St.Label({
			style_class: 'emoji-section-header',
			text: _('Search Results'),
			x_align: Clutter.ActorAlign.START,
		});
		this.add_child(this._label);

		this._gridBox = new St.BoxLayout({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'emoji-grid-box',
			x_expand: true,
		});
		this.add_child(this._gridBox);
	}

	setResults(
		records: EmojiRecord[],
		tone: SkinTone,
		columns: number = DEFAULT_EMOJI_COLUMNS,
		spacing: number = 3,
	): void {
		this._gridBox.destroy_all_children();

		if (records.length === 0) {
			this._label.text = _('No emojis found');
			this.visible = true;
			return;
		}

		this._label.text = _('Search Results');
		let currentRow: St.BoxLayout | null = null;

		for (let i = 0; i < records.length; i++) {
			if (i % columns === 0) {
				currentRow = new St.BoxLayout({
					orientation: Clutter.Orientation.HORIZONTAL,
					style_class: 'emoji-grid-row',
					x_align: Clutter.ActorAlign.START,
					style: `spacing: ${spacing}px;`,
				});
				this._gridBox.add_child(currentRow);
			}

			const record = records[i];
			if (!record) continue;

			const displayChar = this._resolveEmoji(record, tone);
			const button = new EmojiButton(displayChar, record.n);
			button.connect('selected', (_actor, emoji: string) => this.emit('emoji-selected', emoji));
			button.connect('activated', (_actor, emoji: string) => this.emit('emoji-activated', emoji));
			currentRow?.add_child(button);
		}

		this.visible = true;
	}

	getFirstEmoji(): string | null {
		const firstRow = this._gridBox.first_child as St.BoxLayout | null;
		const firstButton = firstRow?.first_child as EmojiButton | null;
		return firstButton?.emoji ?? null;
	}

	clear(): void {
		this._gridBox.destroy_all_children();
		this.visible = false;
	}

	private _resolveEmoji(record: EmojiRecord, tone: SkinTone): string {
		if (tone === SkinTone.Default || !record.s) return record.e;
		return record.s[tone - 1] ?? record.e;
	}
}
