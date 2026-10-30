import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { CharacterButton } from './characterButton.js';
import { CharacterCategory, CharacterRecord, DEFAULT_CHARACTER_COLUMNS } from './characterTypes.js';

const CharacterSectionSignals = {
	'character-selected': { param_types: [GObject.TYPE_STRING] },
	'character-activated': { param_types: [GObject.TYPE_STRING] },
	'clear-recents': {},
} as const;

@registerClass({
	Signals: CharacterSectionSignals,
})
export class CharacterSection extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof CharacterSectionSignals>['emit'];

	public readonly category: CharacterCategory;
	private readonly _gridBox: St.BoxLayout;
	private _records: CharacterRecord[];
	private readonly _buttons: CharacterButton[] = [];
	private _columns: number = DEFAULT_CHARACTER_COLUMNS;
	private _spacing: number = 3;
	private _isMounted: boolean = false;

	constructor(category: CharacterCategory, title: string, records: CharacterRecord[]) {
		super({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'character-section',
			x_expand: true,
			visible: records.length > 0,
		});

		this.category = category;
		this._records = records;

		this.add_child(this._createHeader(title, category === CharacterCategory.Recent));

		this._gridBox = new St.BoxLayout({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'character-grid-box',
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

	setRecords(records: CharacterRecord[], columns: number = DEFAULT_CHARACTER_COLUMNS, spacing: number = 3): void {
		this._records = records;
		this._isMounted = false;
		this._buttons.length = 0;
		this._gridBox.destroy_all_children();
		this.visible = records.length > 0;
		if (this.visible) {
			this.ensureMounted(columns, spacing);
		}
	}

	ensureMounted(columns: number = DEFAULT_CHARACTER_COLUMNS, spacing: number = 3): void {
		if (this._records.length === 0) return;

		if (this._isMounted) {
			if (this._columns !== columns || this._spacing !== spacing) {
				this._columns = columns;
				this._spacing = spacing;
				this._repackButtons();
			}
			return;
		}

		this._isMounted = true;
		this._columns = columns;
		this._spacing = spacing;
		this._createButtons();
	}

	private _repackButtons(): void {
		this._buttons.length = 0;
		this._gridBox.destroy_all_children();
		this._createButtons();
	}

	private _createHeader(title: string, isRecent: boolean): St.BoxLayout {
		const box = new St.BoxLayout({
			style_class: 'character-section-header-box',
			x_expand: true,
			y_align: Clutter.ActorAlign.CENTER,
		});
		box.add_child(new St.Label({ style_class: 'character-section-header', text: title, x_expand: true }));
		if (isRecent) {
			const clearBtn = new St.Button({
				style_class: 'dialog-clear-button character-clear-recents-button',
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

	private _createButtons(): void {
		let row: St.BoxLayout | null = null;
		for (let i = 0; i < this._records.length; i++) {
			if (i % this._columns === 0) {
				row = new St.BoxLayout({
					orientation: Clutter.Orientation.HORIZONTAL,
					style_class: 'character-grid-row',
					x_align: Clutter.ActorAlign.START,
					style: `spacing: ${this._spacing}px;`,
				});
				this._gridBox.add_child(row);
			}

			const record = this._records[i];
			if (!record) continue;

			const button = new CharacterButton(record.ch, record.n);
			button.connect('selected', (_actor, character: string) => {
				this.emit('character-selected', character);
			});
			button.connect('activated', (_actor, character: string) => {
				this.emit('character-activated', character);
			});

			this._buttons.push(button);
			row?.add_child(button);
		}
	}
}
