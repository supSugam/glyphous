import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { SignalMethods, registerClass } from '../common/gjs.js';
import { CharacterDataManager } from './characterData.js';
import { CharacterSection } from './characterSection.js';
import {
	CHARACTER_CATEGORY_DEFINITIONS,
	CharacterCategory,
	CharacterRecord,
	DEFAULT_CHARACTER_COLUMNS,
} from './characterTypes.js';

const Signals = {
	'character-selected': { param_types: [GObject.TYPE_STRING] },
	'character-activated': { param_types: [GObject.TYPE_STRING] },
	'clear-recents': {},
} as const;

@registerClass({ Signals })
export class CharacterSectionsContainer extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof Signals>['emit'];

	public readonly sections: Map<CharacterCategory, CharacterSection> = new Map();
	private _columns: number = DEFAULT_CHARACTER_COLUMNS;
	private _spacing: number = 3;

	constructor(dataManager: CharacterDataManager, recentRecords: CharacterRecord[]) {
		super({ vertical: true, style_class: 'character-continuous-box', x_expand: true });

		for (const { id, label } of CHARACTER_CATEGORY_DEFINITIONS) {
			const isRecent = id === CharacterCategory.Recent;
			const records = isRecent ? recentRecords : dataManager.getCharactersByCategory(id);
			const section = new CharacterSection(id, label, records);
			section.connect('character-selected', (_actor, char: string) => this.emit('character-selected', char));
			section.connect('character-activated', (_actor, char: string) => this.emit('character-activated', char));
			section.connect('clear-recents', () => this.emit('clear-recents'));
			this.sections.set(id, section);
			this.add_child(section);
		}
	}

	mountInitial(columns: number = DEFAULT_CHARACTER_COLUMNS, spacing: number = 3): void {
		this._columns = columns;
		this._spacing = spacing;
		this.sections.get(CharacterCategory.Recent)?.ensureMounted(this._columns, this._spacing);
		this.sections.get(CharacterCategory.Punctuation)?.ensureMounted(this._columns, this._spacing);
		this.mountRemaining();
	}

	ensureCategoryMounted(category: CharacterCategory): void {
		this.sections.get(category)?.ensureMounted(this._columns, this._spacing);
	}

	mountRemaining(): void {
		const categories = Array.from(this.sections.keys());
		let idx = 0;
		GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
			const cat = categories[idx++];
			if (cat) {
				const section = this.sections.get(cat);
				if (section && !section.isMounted) {
					section.ensureMounted(this._columns, this._spacing);
				}
			}
			return idx < categories.length ? GLib.SOURCE_CONTINUE : GLib.SOURCE_REMOVE;
		});
	}

	updateGridMetrics(columns: number, spacing: number): void {
		this._columns = columns;
		this._spacing = spacing;
		for (const section of this.sections.values()) {
			if (section.isMounted) section.ensureMounted(this._columns, this._spacing);
		}
	}

	updateRecentRecords(
		recentRecords: CharacterRecord[],
		columns: number = DEFAULT_CHARACTER_COLUMNS,
		spacing: number = 3,
	): void {
		this._columns = columns;
		this._spacing = spacing;
		this.sections.get(CharacterCategory.Recent)?.setRecords(recentRecords, this._columns, this._spacing);
	}
}
