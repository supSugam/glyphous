import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { CharacterButton } from './characterButton.js';
import { CharacterRecord, DEFAULT_CHARACTER_COLUMNS } from './characterTypes.js';

const SearchResultsSignals = {
	'character-selected': {
		param_types: [GObject.TYPE_STRING],
	},
	'character-activated': {
		param_types: [GObject.TYPE_STRING],
	},
} as const;

@registerClass({
	Signals: SearchResultsSignals,
})
export class CharacterSearchResults extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof SearchResultsSignals>['emit'];

	private readonly _label: St.Label;
	private readonly _gridBox: St.BoxLayout;

	constructor() {
		super({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'character-search-results',
			x_expand: true,
			visible: false,
		});

		this._label = new St.Label({
			style_class: 'character-section-header',
			text: _('Search Results'),
			x_align: Clutter.ActorAlign.START,
		});
		this.add_child(this._label);

		this._gridBox = new St.BoxLayout({
			orientation: Clutter.Orientation.VERTICAL,
			style_class: 'character-grid-box',
			x_expand: true,
		});
		this.add_child(this._gridBox);
	}

	setResults(records: CharacterRecord[], columns: number = DEFAULT_CHARACTER_COLUMNS, spacing: number = 3): void {
		this._gridBox.destroy_all_children();

		if (records.length === 0) {
			this._label.text = _('No characters found');
			this.visible = true;
			return;
		}

		this._label.text = _('Search Results');
		let currentRow: St.BoxLayout | null = null;

		for (let i = 0; i < records.length; i++) {
			if (i % columns === 0) {
				currentRow = new St.BoxLayout({
					orientation: Clutter.Orientation.HORIZONTAL,
					style_class: 'character-grid-row',
					x_align: Clutter.ActorAlign.START,
					style: `spacing: ${spacing}px;`,
				});
				this._gridBox.add_child(currentRow);
			}

			const record = records[i];
			if (!record) continue;

			const button = new CharacterButton(record.ch, record.n);
			button.connect('selected', (_actor, character: string) => {
				this.emit('character-selected', character);
			});
			button.connect('activated', (_actor, character: string) => {
				this.emit('character-activated', character);
			});
			currentRow?.add_child(button);
		}

		this.visible = true;
	}

	getFirstCharacter(): string | null {
		const firstRow = this._gridBox.first_child as St.BoxLayout | null;
		const firstButton = firstRow?.first_child as CharacterButton | null;
		return firstButton?.character ?? null;
	}

	clear(): void {
		this._gridBox.destroy_all_children();
		this.visible = false;
	}
}
