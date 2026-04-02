/**
 * Vue-specific TUI component wrappers.
 *
 * These are Vue components (using defineComponent) that wrap the lower-level
 * TUI host elements. They provide proper Vue typing, slots, emits, and
 * lifecycle management for common TUI primitives and interactive components.
 */

import { defineComponent, h, type PropType, onUnmounted, ref, watch } from "@vue/runtime-core";
import type { TuiNodeProps, KeyEvent } from "@seedcli/tui-core";

// ─── Primitive Components ───

/**
 * <TuiText>Hello</TuiText>
 *
 * Renders a text node. Content is passed as the default slot or `content` prop.
 */
export const TuiText = defineComponent({
	name: "TuiText",
	props: {
		content: { type: String, default: "" },
		color: String,
		bgColor: String,
		bold: Boolean,
		italic: Boolean,
		underline: Boolean,
		dim: Boolean,
		inverse: Boolean,
		strikethrough: Boolean,
	},
	setup(props, { slots }) {
		return () => {
			const slotContent = slots.default?.();
			return h("tui-text" as any, {
				color: props.color,
				bgColor: props.bgColor,
				bold: props.bold || undefined,
				italic: props.italic || undefined,
				underline: props.underline || undefined,
				dim: props.dim || undefined,
				inverse: props.inverse || undefined,
				strikethrough: props.strikethrough || undefined,
				content: slotContent ? undefined : props.content,
			}, slotContent);
		};
	},
});

/**
 * <TuiBox :border="'rounded'" :padding="1">...</TuiBox>
 */
export const TuiBox = defineComponent({
	name: "TuiBox",
	props: {
		width: [Number, String] as PropType<TuiNodeProps["width"]>,
		height: [Number, String] as PropType<TuiNodeProps["height"]>,
		border: [String, Object] as PropType<TuiNodeProps["border"]>,
		padding: [Number, Array] as PropType<TuiNodeProps["padding"]>,
		gap: Number,
		overflow: String as PropType<TuiNodeProps["overflow"]>,
		alignItems: String as PropType<TuiNodeProps["alignItems"]>,
		justifyContent: String as PropType<TuiNodeProps["justifyContent"]>,
		color: String,
		bgColor: String,
		focusable: Boolean,
		visible: { type: Boolean, default: true },
	},
	setup(props, { slots }) {
		return () => h("tui-box" as any, { ...props, visible: props.visible || undefined }, slots.default?.());
	},
});

/**
 * <TuiRow :gap="2">...</TuiRow>
 */
export const TuiRow = defineComponent({
	name: "TuiRow",
	props: {
		width: [Number, String] as PropType<TuiNodeProps["width"]>,
		height: [Number, String] as PropType<TuiNodeProps["height"]>,
		gap: Number,
		padding: [Number, Array] as PropType<TuiNodeProps["padding"]>,
		alignItems: String as PropType<TuiNodeProps["alignItems"]>,
		justifyContent: String as PropType<TuiNodeProps["justifyContent"]>,
		overflow: String as PropType<TuiNodeProps["overflow"]>,
	},
	setup(props, { slots }) {
		return () => h("tui-row" as any, props, slots.default?.());
	},
});

/**
 * <TuiColumn :gap="1">...</TuiColumn>
 */
export const TuiColumn = defineComponent({
	name: "TuiColumn",
	props: {
		width: [Number, String] as PropType<TuiNodeProps["width"]>,
		height: [Number, String] as PropType<TuiNodeProps["height"]>,
		gap: Number,
		padding: [Number, Array] as PropType<TuiNodeProps["padding"]>,
		alignItems: String as PropType<TuiNodeProps["alignItems"]>,
		justifyContent: String as PropType<TuiNodeProps["justifyContent"]>,
		overflow: String as PropType<TuiNodeProps["overflow"]>,
	},
	setup(props, { slots }) {
		return () => h("tui-column" as any, props, slots.default?.());
	},
});

/**
 * <TuiSpacer />
 */
export const TuiSpacer = defineComponent({
	name: "TuiSpacer",
	props: {
		width: [Number, String] as PropType<TuiNodeProps["width"]>,
		height: [Number, String] as PropType<TuiNodeProps["height"]>,
	},
	setup(props) {
		return () => h("tui-spacer" as any, props);
	},
});

// ─── Interactive Components ───

/**
 * <TuiInput v-model="text" placeholder="Type..." />
 *
 * Text input with cursor, masked mode, and keyboard handling.
 * Uses the host-level "tui-component" element with custom key handlers.
 */
export const TuiInput = defineComponent({
	name: "TuiInput",
	props: {
		modelValue: { type: String, default: "" },
		placeholder: { type: String, default: "" },
		mask: { type: String, default: "" },
		width: [Number, String] as PropType<TuiNodeProps["width"]>,
	},
	emits: ["update:modelValue", "submit"],
	setup(props, { emit }) {
		const cursorPos = ref(props.modelValue.length);

		watch(() => props.modelValue, (val) => {
			if (cursorPos.value > val.length) {
				cursorPos.value = val.length;
			}
		});

		const onKey = (event: KeyEvent) => {
			const key = event.key;
			const mods = event.modifiers;
			let value = props.modelValue;

			if (key === "enter") {
				emit("submit", value);
				event.stopPropagation();
				return;
			}

			if (key === "backspace") {
				if (cursorPos.value > 0) {
					value = value.slice(0, cursorPos.value - 1) + value.slice(cursorPos.value);
					cursorPos.value--;
					emit("update:modelValue", value);
				}
				event.stopPropagation();
				return;
			}

			if (key === "delete") {
				if (cursorPos.value < value.length) {
					value = value.slice(0, cursorPos.value) + value.slice(cursorPos.value + 1);
					emit("update:modelValue", value);
				}
				event.stopPropagation();
				return;
			}

			if (key === "left") {
				if (cursorPos.value > 0) cursorPos.value--;
				event.stopPropagation();
				return;
			}

			if (key === "right") {
				if (cursorPos.value < value.length) cursorPos.value++;
				event.stopPropagation();
				return;
			}

			if (key === "home") {
				cursorPos.value = 0;
				event.stopPropagation();
				return;
			}

			if (key === "end") {
				cursorPos.value = value.length;
				event.stopPropagation();
				return;
			}

			// Ctrl+U: clear
			if (key === "u" && mods.has("ctrl")) {
				cursorPos.value = 0;
				emit("update:modelValue", "");
				event.stopPropagation();
				return;
			}

			// Printable character
			if (key.length === 1 && !mods.has("ctrl") && !mods.has("alt") && !mods.has("meta")) {
				value = value.slice(0, cursorPos.value) + key + value.slice(cursorPos.value);
				cursorPos.value++;
				emit("update:modelValue", value);
				event.stopPropagation();
			}
		};

		return () => {
			const display = props.modelValue
				? (props.mask ? props.mask.repeat(props.modelValue.length) : props.modelValue)
				: "";
			const showPlaceholder = !props.modelValue && props.placeholder;

			return h("tui-component" as any, {
				focusable: true,
				width: props.width,
				onKey,
			}, [
				h("tui-text" as any, {
					content: showPlaceholder ? props.placeholder : display,
					dim: showPlaceholder ? true : undefined,
				}),
			]);
		};
	},
});

/**
 * <TuiSelect :items="['A', 'B', 'C']" v-model="selected" />
 */
export const TuiSelect = defineComponent({
	name: "TuiSelect",
	props: {
		items: {
			type: Array as PropType<Array<string | { label: string; value: string; disabled?: boolean }>>,
			required: true,
		},
		modelValue: { type: Number, default: 0 },
		marker: { type: String, default: "\u25B8" },
	},
	emits: ["update:modelValue", "submit"],
	setup(props, { emit }) {
		const normalize = (item: string | { label: string; value: string; disabled?: boolean }) =>
			typeof item === "string" ? { label: item, value: item, disabled: false } : item;

		const findNext = (from: number, direction: 1 | -1): number => {
			const items = props.items;
			let idx = from + direction;
			while (idx >= 0 && idx < items.length) {
				if (!normalize(items[idx]).disabled) return idx;
				idx += direction;
			}
			return from;
		};

		const onKey = (event: KeyEvent) => {
			const key = event.key;

			if (key === "down" || key === "j") {
				const next = findNext(props.modelValue, 1);
				if (next !== props.modelValue) {
					emit("update:modelValue", next);
				}
				event.stopPropagation();
				return;
			}

			if (key === "up" || key === "k") {
				const prev = findNext(props.modelValue, -1);
				if (prev !== props.modelValue) {
					emit("update:modelValue", prev);
				}
				event.stopPropagation();
				return;
			}

			if (key === "enter") {
				const item = normalize(props.items[props.modelValue]);
				if (!item.disabled) {
					emit("submit", item);
				}
				event.stopPropagation();
			}
		};

		return () => {
			const children = props.items.map((raw, i) => {
				const item = normalize(raw);
				const isSelected = i === props.modelValue;
				const prefix = isSelected ? `${props.marker} ` : "  ";
				return h("tui-text" as any, {
					content: `${prefix}${item.label}`,
					dim: item.disabled ? true : undefined,
					bold: isSelected ? true : undefined,
				});
			});

			return h("tui-component" as any, {
				focusable: true,
				onKey,
			}, children);
		};
	},
});
