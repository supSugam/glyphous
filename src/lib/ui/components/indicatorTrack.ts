import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { registerClass } from '../../common/gjs.js';

export const INDICATOR_WIDTH = 20;

export const INDICATOR_HEIGHT = 3;

const ANIMATION_DURATION_MS = 200;

@registerClass()
export class IndicatorTrack extends St.Widget {
	private readonly _indicator: St.Widget;

	constructor() {
		super({ height: INDICATOR_HEIGHT, x_expand: true });

		this._indicator = new St.Widget({
			style_class: 'win-tab-indicator',
			width: INDICATOR_WIDTH,
			height: INDICATOR_HEIGHT,
		});
		this.add_child(this._indicator);
	}

	updatePosition(buttonBox: Clutter.ActorBox, animate: boolean): void {
		const buttonWidth = buttonBox.get_width();
		if (buttonWidth <= 0) return;

		const targetX = buttonBox.x1 + (buttonWidth - INDICATOR_WIDTH) / 2;
		if (animate) {
			this._indicator.ease({
				x: targetX,
				duration: ANIMATION_DURATION_MS,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
			});
		} else {
			this._indicator.remove_all_transitions();
			this._indicator.x = targetX;
		}
	}

	override vfunc_get_preferred_width(_forHeight: number): [number, number] {
		return [0, 0];
	}

	override vfunc_allocate(box: Clutter.ActorBox): void {
		super.vfunc_allocate(box);

		const child = this.first_child;
		if (child) {
			const x = Math.round(child.x);
			const width = child.width;
			const height = box.get_height();
			const childBox = new Clutter.ActorBox({
				x1: x,
				y1: 0,
				x2: x + width,
				y2: height,
			});
			child.allocate(childBox);
		}
	}
}
