import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import { registerClass } from '../common/gjs.js';

const TOAST_DURATION_MS = 1100;
const FADE_DURATION_MS = 200;

@registerClass()
export class CharacterToast extends St.Label {
	private _hideTimeoutId: number = -1;

	constructor() {
		super({
			style_class: 'character-toast',
			text: '',
			opacity: 0,
			visible: false,
			reactive: false,
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.END,
		});
	}

	showCharacter(character: string): void {
		if (this._hideTimeoutId >= 0) {
			GLib.source_remove(this._hideTimeoutId);
			this._hideTimeoutId = -1;
		}

		this.text = _('Copied %s').format(character);
		this.visible = true;
		this.remove_all_transitions();
		this.ease({
			opacity: 255,
			duration: FADE_DURATION_MS,
			mode: Clutter.AnimationMode.EASE_OUT_QUAD,
		});

		this._hideTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TOAST_DURATION_MS, () => {
			this._hideTimeoutId = -1;
			this.ease({
				opacity: 0,
				duration: FADE_DURATION_MS,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
				onComplete: () => {
					this.visible = false;
				},
			});
			return GLib.SOURCE_REMOVE;
		});
	}

	hideImmediate(): void {
		if (this._hideTimeoutId >= 0) {
			GLib.source_remove(this._hideTimeoutId);
			this._hideTimeoutId = -1;
		}
		this.remove_all_transitions();
		this.opacity = 0;
		this.visible = false;
	}
}
