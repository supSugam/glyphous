import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { CharacterCategory, CharacterRecord } from './characterTypes.js';

const MAX_RECENT_CHARACTERS = 24;

export class RecentCharactersStore {
	private readonly _filePath: string;
	private _recentCharacters: string[] | null = null;

	constructor() {
		const configDir = GLib.build_filenamev([GLib.get_user_config_dir(), 'glyphous']);
		GLib.mkdir_with_parents(configDir, 0o755);
		this._filePath = GLib.build_filenamev([configDir, 'recent_characters.json']);
	}

	get hasRecents(): boolean {
		return this.getRecentCharacters().length > 0;
	}

	getRecentCharacters(): string[] {
		if (this._recentCharacters !== null) return this._recentCharacters;

		const file = Gio.File.new_for_path(this._filePath);
		if (!file.query_exists(null)) {
			this._recentCharacters = [];
			return this._recentCharacters;
		}

		try {
			const [success, bytes] = file.load_contents(null);
			if (success) {
				const text = new TextDecoder().decode(bytes);
				const parsed = JSON.parse(text) as unknown;
				if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
					this._recentCharacters = parsed.slice(0, MAX_RECENT_CHARACTERS);
					return this._recentCharacters;
				}
			}
		} catch {
			// Fallback on corrupt file
		}

		this._recentCharacters = [];
		return this._recentCharacters;
	}

	getRecentRecords(): CharacterRecord[] {
		return this.getRecentCharacters().map((character) => ({
			ch: character,
			n: character,
			c: CharacterCategory.Recent,
			k: [],
		}));
	}

	recordCharacterUsage(character: string): void {
		const recents = this.getRecentCharacters().filter((item) => item !== character);
		recents.unshift(character);
		if (recents.length > MAX_RECENT_CHARACTERS) {
			recents.length = MAX_RECENT_CHARACTERS;
		}
		this._recentCharacters = recents;
		this._saveToDisk();
	}

	clear(): void {
		this._recentCharacters = [];
		try {
			const file = Gio.File.new_for_path(this._filePath);
			if (file.query_exists(null)) {
				file.delete(null);
			}
		} catch {
			// Ignore disk delete failure
		}
	}

	private _saveToDisk(): void {
		if (!this._recentCharacters) return;

		try {
			const file = Gio.File.new_for_path(this._filePath);
			const data = JSON.stringify(this._recentCharacters);
			file.replace_contents(
				new TextEncoder().encode(data),
				null,
				false,
				Gio.FileCreateFlags.REPLACE_DESTINATION,
				null,
			);
		} catch {
			// Ignore disk write failure
		}
	}
}
