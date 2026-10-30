import GObject from 'gi://GObject';
import St from 'gi://St';

import type CopyousExtension from '../../extension.js';
import { SignalMethods, registerClass } from '../common/gjs.js';
import { InputChain } from '../common/inputChain.js';
import { createViewScrollView, forwardSelection } from '../common/viewUtils.js';
import { CharacterBottomBar } from './characterBottomBar.js';
import { CharacterDataManager } from './characterData.js';
import { CharacterSearchResults } from './characterSearchResults.js';
import { CharacterSectionsContainer } from './characterSectionsContainer.js';
import { CharacterToast } from './characterToast.js';
import { CharacterCategory, DEFAULT_CHARACTER_COLUMNS, calculateGridMetrics } from './characterTypes.js';
import { setupCharacterBottomBar } from './characterViewWiring.js';
import { RecentCharactersStore } from './recentCharactersStore.js';

const Signals = {
	'character-selected': { param_types: [GObject.TYPE_STRING] },
	'character-activated': { param_types: [GObject.TYPE_STRING] },
} as const;

@registerClass({ Signals })
export class CharactersView extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof Signals>['emit'];

	private readonly _dataManager: CharacterDataManager;
	private readonly _recentStore: RecentCharactersStore;
	private readonly _scrollView: St.ScrollView;
	private readonly _sectionsContainer: CharacterSectionsContainer;
	private readonly _searchResults: CharacterSearchResults;
	private readonly _bottomBar: CharacterBottomBar;
	private readonly _toast: CharacterToast;
	private readonly _chain: InputChain = new InputChain();
	private _columns: number = DEFAULT_CHARACTER_COLUMNS;
	private _spacing: number = 3;
	private _targetWidth: number = 0;

	constructor(ext: CopyousExtension) {
		super({ vertical: true, style_class: 'characters-view', x_expand: true, y_expand: true });

		this._dataManager = new CharacterDataManager(ext);
		this._recentStore = new RecentCharactersStore();

		const [scrollView, contentBox] = createViewScrollView('characters-scroll-view', 'characters-content-box');
		this._scrollView = scrollView;
		this.add_child(this._scrollView);

		this._searchResults = new CharacterSearchResults();
		this._sectionsContainer = new CharacterSectionsContainer(
			this._dataManager,
			this._recentStore.getRecentRecords(),
		);
		forwardSelection(
			[this._searchResults, this._sectionsContainer],
			(c) => this._onCharacter(c, false),
			(c) => this._onCharacter(c, true),
			'character-selected',
			'character-activated',
			contentBox,
		);

		this._toast = new CharacterToast();
		this.add_child(this._toast);

		this._bottomBar = new CharacterBottomBar(ext);
		this.add_child(this._bottomBar);

		setupCharacterBottomBar(this._scrollView, this._bottomBar, this._sectionsContainer, this._recentStore, () =>
			this._updateRecentSection(),
		);

		this._sectionsContainer.mountInitial(this._columns, this._spacing);
	}

	override vfunc_get_preferred_width(forHeight: number): [number, number] {
		return this._targetWidth > 0
			? [this._targetWidth, this._targetWidth]
			: super.vfunc_get_preferred_width(forHeight);
	}

	setViewWidth(width: number): void {
		if (width <= 0) return;
		this._targetWidth = width;
		this.width = width;
		const metrics = calculateGridMetrics(width);
		this._columns = metrics.columns;
		this._spacing = metrics.spacing;
		this._sectionsContainer.updateGridMetrics(this._columns, this._spacing);
		this.queue_relayout();
	}

	clearChain(): void {
		this._chain.clear();
	}

	activateFirst(): boolean {
		const target = this._chain.hasChain ? '' : this._searchResults.getFirstCharacter();
		if (target === null) return false;
		this._onCharacter(target, true);
		return true;
	}

	search(query: string): void {
		const trimmed = query.trim();
		this._sectionsContainer.visible = !trimmed;
		if (!trimmed) return this._searchResults.clear();
		this._searchResults.setResults(this._dataManager.searchCharacters(query), this._columns, this._spacing);
	}

	override vfunc_map(): void {
		super.vfunc_map();
		this._chain.clear();
		this._updateRecentSection();
		this._sectionsContainer.ensureCategoryMounted(CharacterCategory.Punctuation);
	}

	private _updateRecentSection(): void {
		const recents = this._recentStore.getRecentRecords();
		this._bottomBar.setRecentVisible(recents.length > 0);
		this._sectionsContainer.updateRecentRecords(recents, this._columns, this._spacing);
	}

	private _onCharacter(character: string, activate: boolean): void {
		if (character) {
			this._recentStore.recordCharacterUsage(character);
			this._updateRecentSection();
		}
		if (activate) {
			this._toast.hideImmediate();
			this.emit('character-activated', this._chain.consume(character));
		} else {
			this._toast.showCharacter(this._chain.append(character));
			this.emit('character-selected', this._chain.current);
		}
	}
}
