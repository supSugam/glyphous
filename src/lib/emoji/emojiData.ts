import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import type CopyousExtension from '../../extension.js';
import { EmojiCategory, EmojiRecord, SkinTone } from './emojiTypes.js';

export class EmojiDataManager {
	private _emojis: EmojiRecord[] = [];
	private readonly _byCategory: Map<EmojiCategory, EmojiRecord[]> = new Map();
	private _isLoaded: boolean = false;

	constructor(private readonly _ext: CopyousExtension) {}

	load(): void {
		if (this._isLoaded) return;
		this._isLoaded = true;

		let jsonText: string | null = null;
		try {
			const bytes = Gio.resources_lookup_data(
				'/org/gnome/Shell/Extensions/glyphous/data/emoji.json',
				Gio.ResourceLookupFlags.NONE,
			);
			const data = bytes.get_data();
			if (data) jsonText = new TextDecoder().decode(data);
		} catch {
			// Fallback to direct file read if resource is unavailable
			const file = this._ext.dir.get_child('resources').get_child('data').get_child('emoji.json');
			if (file.query_exists(null)) {
				const [success, contents] = GLib.file_get_contents(file.get_path()!);
				if (success) jsonText = new TextDecoder().decode(contents);
			}
		}

		if (!jsonText) return;

		try {
			this._emojis = JSON.parse(jsonText) as EmojiRecord[];
			for (const emoji of this._emojis) {
				let list = this._byCategory.get(emoji.c);
				if (!list) {
					list = [];
					this._byCategory.set(emoji.c, list);
				}
				list.push(emoji);
			}
		} catch (error) {
			this._ext.logger.error('Failed to parse emoji dataset', error);
		}
	}

	getEmojisByCategory(category: EmojiCategory): EmojiRecord[] {
		this.load();
		return this._byCategory.get(category) ?? [];
	}

	getDisplayEmoji(record: EmojiRecord, tone: SkinTone): string {
		if (tone === SkinTone.Default || !record.s) return record.e;
		const variation = record.s[tone - 1];
		return variation ?? record.e;
	}

	searchEmojis(query: string, limit: number = 72): EmojiRecord[] {
		this.load();
		const normalized = query.trim().toLowerCase();
		if (!normalized) return [];

		const matches: EmojiRecord[] = [];
		for (const item of this._emojis) {
			if (item.n.toLowerCase().includes(normalized) || item.k.some((k) => k.startsWith(normalized))) {
				matches.push(item);
				if (matches.length >= limit) break;
			}
		}
		return matches;
	}
}
