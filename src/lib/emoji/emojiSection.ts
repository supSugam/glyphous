import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { EmojiButton } from './emojiButton.js';
import { DEFAULT_EMOJI_COLUMNS, EmojiCategory, EmojiRecord, SkinTone, resolveEmoji } from './emojiTypes.js';

const Signals = {
	'emoji-selected': { param_types: [GObject.TYPE_STRING] },
	'emoji-activated': { param_types: [GObject.TYPE_STRING] },
	'clear-recents': {},
} as const;

@registerClass({ Signals })
export class EmojiSection extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof Signals>['emit'];

	public readonly category: EmojiCategory;
	private readonly _gridBox: St.BoxLayout;
	private _records: EmojiRecord[];
	private readonly _buttons: EmojiButton[] = [];
	private _columns: number = DEFAULT_EMOJI_COLUMNS;
	private _spacing: number = 3;
	private _isMounted: boolean = false;

	constructor(category: EmojiCategory, title: string, records: EmojiRecord[]) {
		super({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'emoji-section',
			x_expand: true,
			visible: records.length > 0,
		});
		this.category = category;
		this._records = records;

		this.add_child(this._createHeader(title, category === EmojiCategory.Recent));
		this._gridBox = new St.BoxLayout({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'emoji-grid-box',
			x_expand: true,
		});
		this.add_child(this._gridBox);
	}

	get isMounted(): boolean {
		return this._isMounted;
	}

	get recordCount(): number {
		return this._records.length;
	}

	setRecords(records: EmojiRecord[], tone = SkinTone.Default, columns = DEFAULT_EMOJI_COLUMNS, spacing = 3): void {
		this._records = records;
		this._isMounted = false;
		this._buttons.length = 0;
		this._gridBox.destroy_all_children();
		this.visible = records.length > 0;
		if (this.visible) this.ensureMounted(tone, columns, spacing);
	}

	ensureMounted(tone = SkinTone.Default, columns = DEFAULT_EMOJI_COLUMNS, spacing = 3): void {
		if (this._records.length === 0) return;
		if (this._isMounted) {
			if (this._columns !== columns || this._spacing !== spacing) {
				this._columns = columns;
				this._spacing = spacing;
				this._repackButtons(tone);
			}
			return;
		}
		this._isMounted = true;
		this._columns = columns;
		this._spacing = spacing;
		this._createButtons(tone);
	}

	updateSkinTone(tone: SkinTone): void {
		if (!this._isMounted) return;
		for (let i = 0; i < this._records.length; i++) {
			const record = this._records[i];
			const button = this._buttons[i];
			if (record?.s && button) button.updateEmoji(resolveEmoji(record, tone));
		}
	}

	private _createHeader(title: string, isRecent: boolean): St.BoxLayout {
		const box = new St.BoxLayout({
			style_class: 'emoji-section-header-box',
			x_expand: true,
			y_align: Clutter.ActorAlign.CENTER,
		});
		box.add_child(new St.Label({ style_class: 'emoji-section-header', text: title, x_expand: true }));
		if (isRecent) {
			const clearBtn = new St.Button({
				style_class: 'dialog-clear-button emoji-clear-recents-button',
				label: _('Clear'),
				can_focus: true,
				track_hover: true,
				y_align: Clutter.ActorAlign.CENTER,
				x_align: Clutter.ActorAlign.END,
				accessible_name: _('Clear Recents'),
			});
			clearBtn.connect('clicked', () => this.emit('clear-recents'));
			box.add_child(clearBtn);
		}
		return box;
	}

	private _newRow(): St.BoxLayout {
		const row = new St.BoxLayout({
			orientation: Clutter.Orientation.HORIZONTAL,
			style_class: 'emoji-grid-row',
			x_align: Clutter.ActorAlign.START,
			style: `spacing: ${this._spacing}px;`,
		});
		this._gridBox.add_child(row);
		return row;
	}

	private _repackButtons(tone: SkinTone): void {
		this._buttons.length = 0;
		this._gridBox.destroy_all_children();
		this._createButtons(tone);
	}

	private _createButtons(tone: SkinTone): void {
		let row: St.BoxLayout | null = null;
		for (let i = 0; i < this._records.length; i++) {
			if (i % this._columns === 0) row = this._newRow();
			const record = this._records[i];
			if (!record) continue;
			const button = new EmojiButton(resolveEmoji(record, tone), record.n);
			button.connect('selected', (_actor, emoji: string) => this.emit('emoji-selected', emoji));
			button.connect('activated', (_actor, emoji: string) => this.emit('emoji-activated', emoji));
			this._buttons.push(button);
			row?.add_child(button);
		}
	}
}
