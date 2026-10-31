import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import CopyousExtension from '../../../extension.js';
import { SignalMethods, registerClass } from '../../common/gjs.js';

const DOUBLE_CLICK_TIME_MS = 350;

const DialogDragHandleSignals = {
	'drag-start': {
		param_types: [GObject.TYPE_DOUBLE, GObject.TYPE_DOUBLE],
	},
	'reset-position': {},
} as const;

@registerClass({
	Signals: DialogDragHandleSignals,
})
export class DialogDragHandle extends St.BoxLayout {
	declare emit: SignalMethods<this, typeof DialogDragHandleSignals>['emit'];

	private readonly _pill: St.Widget;
	private _lastClickTime: number = 0;
	private _isDragging: boolean = false;

	constructor(_ext?: CopyousExtension) {
		super({
			style_class: 'dialog-drag-handle',
			orientation: Clutter.Orientation.HORIZONTAL,
			x_align: Clutter.ActorAlign.FILL,
			x_expand: true,
			reactive: true,
			track_hover: true,
		});

		this._pill = new St.Widget({
			style_class: 'dialog-drag-handle-pill',
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
			width: 36,
			height: 4,
		});
		this.add_child(this._pill);

		this.connect('notify::hover', () => {
			if (this._isDragging) return;
			const cursor = this.hover ? Clutter.CursorType.GRAB : Clutter.CursorType.DEFAULT;
			this.set_cursor_type(cursor);
			global.stage.set_cursor_type(cursor);
		});
	}

	public setDragging(dragging: boolean): void {
		this._isDragging = dragging;
		const cursor = dragging
			? Clutter.CursorType.GRABBING
			: this.hover
				? Clutter.CursorType.GRAB
				: Clutter.CursorType.DEFAULT;
		this.set_cursor_type(cursor);
		global.stage.set_cursor_type(cursor);
	}

	override vfunc_button_press_event(event: Clutter.Event): boolean {
		if (event.get_button() !== Clutter.BUTTON_PRIMARY) return Clutter.EVENT_PROPAGATE;

		const now = Date.now();
		if (now - this._lastClickTime < DOUBLE_CLICK_TIME_MS) {
			this._lastClickTime = 0;
			this.emit('reset-position');
			return Clutter.EVENT_STOP;
		}
		this._lastClickTime = now;

		const [x, y] = event.get_coords();
		this.emit('drag-start', x, y);
		return Clutter.EVENT_STOP;
	}

	override vfunc_touch_event(event: Clutter.Event): boolean {
		if (event.type() === Clutter.EventType.TOUCH_BEGIN) {
			const [x, y] = event.get_coords();
			this.emit('drag-start', x, y);
			return Clutter.EVENT_STOP;
		}
		return Clutter.EVENT_PROPAGATE;
	}
}
