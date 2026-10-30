import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { EmojiCategory, EmojiRecord } from './emojiTypes.js';

const MAX_RECENT_EMOJIS = 24;

export class RecentEmojisStore {
	private readonly _filePath: string;
	private _recentEmojis: string[] | null = null;

	constructor() {
		const configDir = GLib.build_filenamev([GLib.get_user_config_dir(), 'glyphous']);
		GLib.mkdir_with_parents(configDir, 0o755);
		this._filePath = GLib.build_filenamev([configDir, 'recent_emojis.json']);
	}

	get hasRecents(): boolean {
		return this.getRecentEmojis().length > 0;
	}

	getRecentEmojis(): string[] {
		if (this._recentEmojis !== null) return this._recentEmojis;

		const file = Gio.File.new_for_path(this._filePath);
		if (!file.query_exists(null)) {
			this._recentEmojis = [];
			return this._recentEmojis;
		}

		try {
			const [success, bytes] = file.load_contents(null);
			if (success) {
				const text = new TextDecoder().decode(bytes);
				const parsed = JSON.parse(text) as unknown;
				if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
					this._recentEmojis = parsed.slice(0, MAX_RECENT_EMOJIS);
					return this._recentEmojis;
				}
			}
		} catch {
			// Fallback on corrupt file
		}

		this._recentEmojis = [];
		return this._recentEmojis;
	}

	getRecentRecords(): EmojiRecord[] {
		return this.getRecentEmojis().map((emoji) => ({
			e: emoji,
			n: emoji,
			c: EmojiCategory.Recent,
			k: [],
			s: null,
		}));
	}

	recordEmojiUsage(emoji: string): void {
		const recents = this.getRecentEmojis().filter((item) => item !== emoji);
		recents.unshift(emoji);
		if (recents.length > MAX_RECENT_EMOJIS) {
			recents.length = MAX_RECENT_EMOJIS;
		}
		this._recentEmojis = recents;
		this._saveToDisk();
	}

	clear(): void {
		this._recentEmojis = [];
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
		if (!this._recentEmojis) return;

		try {
			const file = Gio.File.new_for_path(this._filePath);
			const data = JSON.stringify(this._recentEmojis);
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
