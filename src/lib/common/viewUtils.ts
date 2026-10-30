import Clutter from 'gi://Clutter';
import St from 'gi://St';

export function createViewScrollView(styleClass: string, contentStyleClass: string): [St.ScrollView, St.BoxLayout] {
	const scrollView = new St.ScrollView({
		style_class: styleClass,
		x_expand: true,
		y_expand: true,
		vscrollbar_policy: St.PolicyType.EXTERNAL,
		hscrollbar_policy: St.PolicyType.NEVER,
	});
	const contentBox = new St.BoxLayout({ vertical: true, style_class: contentStyleClass, x_expand: true });
	scrollView.add_child(contentBox);
	return [scrollView, contentBox];
}

export function forwardSelection<T extends Clutter.Actor>(
	targets: T[],
	onSelected: (text: string) => void,
	onActivated: (text: string) => void,
	selectedSignal: string,
	activatedSignal: string,
	container: St.BoxLayout,
): void {
	for (const target of targets) {
		target.connect(selectedSignal, (_a: unknown, text: unknown) => onSelected(text as string));
		target.connect(activatedSignal, (_a: unknown, text: unknown) => onActivated(text as string));
		container.add_child(target);
	}
}
