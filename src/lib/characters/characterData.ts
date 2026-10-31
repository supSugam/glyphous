import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import type CopyousExtension from '../../extension.js';
import { CharacterCategory, CharacterRecord } from './characterTypes.js';

export class CharacterDataManager {
	private _characters: CharacterRecord[] = [];
	private readonly _byCategory: Map<CharacterCategory, CharacterRecord[]> = new Map();
	private _isLoaded: boolean = false;

	constructor(private readonly _ext: CopyousExtension) {}

	load(): void {
		if (this._isLoaded) return;
		this._isLoaded = true;

		let jsonText: string | null = null;
		try {
			const bytes = Gio.resources_lookup_data(
				'/org/gnome/Shell/Extensions/glyphous/data/characters.json',
				Gio.ResourceLookupFlags.NONE,
			);
			const data = bytes.get_data();
			if (data) jsonText = new TextDecoder().decode(data);
		} catch {
			const file = this._ext.dir.get_child('resources').get_child('data').get_child('characters.json');
			if (file.query_exists(null)) {
				const [success, contents] = GLib.file_get_contents(file.get_path()!);
				if (success) jsonText = new TextDecoder().decode(contents);
			}
		}

		if (!jsonText) return;

		try {
			this._characters = JSON.parse(jsonText) as CharacterRecord[];
			for (const record of this._characters) {
				let list = this._byCategory.get(record.c);
				if (!list) {
					list = [];
					this._byCategory.set(record.c, list);
				}
				list.push(record);
			}
		} catch (error) {
			this._ext.logger.error('Failed to parse characters dataset', error);
		}
	}

	getCharactersByCategory(category: CharacterCategory): CharacterRecord[] {
		this.load();
		return this._byCategory.get(category) ?? [];
	}

	searchCharacters(query: string, limit: number = 72): CharacterRecord[] {
		this.load();
		const normalized = query.trim().toLowerCase();
		if (!normalized) return [];

		const matches: CharacterRecord[] = [];
		for (const item of this._characters) {
			if (
				item.ch === normalized ||
				item.n.toLowerCase().includes(normalized) ||
				item.k.some((k) => k.startsWith(normalized))
			) {
				matches.push(item);
				if (matches.length >= limit) break;
			}
		}
		return matches;
	}
}
