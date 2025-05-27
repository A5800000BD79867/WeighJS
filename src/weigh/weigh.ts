import { URL } from "url";
import { IMemoryReport, IProfiler, ISizeStrategy } from "./types";
import { eMemorySize, eMemoryUnit } from "./enum";

class DefaultSizeStrategy implements ISizeStrategy {
	public supports(_value: any): boolean {
		return true;
	}

	public sizeOf(value: any, profiler: IProfiler): number {
		if (value === null) return eMemorySize.NULL;
		if (value === undefined) return eMemorySize.UNDEFINED;

		const type = typeof value;

		switch (type) {
			case "string": return value.length * eMemorySize.STRING_CHAR;
			case "number": return eMemorySize.NUMBER;
			case "boolean": return eMemorySize.BOOLEAN;
			case "bigint": return eMemorySize.BIGINT;
			case "function": return eMemorySize.DEFAULT_FUNCTION + value.toString().length * eMemorySize.STRING_CHAR;
			case "symbol": return value.description ? (value.description.length * eMemorySize.STRING_CHAR) : 0;
		}

		if (profiler.isVisited(value)) return eMemorySize.REFERENCE;
		profiler.markVisited(value);

		if (Array.isArray(value)) return value.reduce((sum, item) => sum + profiler.computeSize(item), 0);

		if (value instanceof Map) {
			let size = eMemorySize.DEFAULT_MAP;
			for (const { 0: key, 1: val } of value) size += profiler.computeSize(key) + profiler.computeSize(val);
			return size;
		}

		if (value instanceof Set) {
			let size = eMemorySize.DEFAULT_SET;
			for (const item of value) size += profiler.computeSize(item);
			return size;
		}

		if (Buffer.isBuffer(value)) return value.length;
		if (value instanceof Date) return eMemorySize.DATE;
		if (value instanceof RegExp) return value.toString().length * eMemorySize.STRING_CHAR;

		let size = eMemorySize.DEFAULT_OBJECT;

		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key)) {
				size += key.length * eMemorySize.STRING_CHAR;
				size += profiler.computeSize(value[key]);
			}
		}

		return size;
	}
}

export class URLSizeStrategy implements ISizeStrategy {
	public supports(value: any): boolean {
		return value?.toString?.() && typeof value.toString === "function" && /^https?:/.test(value.toString());
	}

	public sizeOf(value: URL, _profiler: IProfiler): number {
		return eMemorySize.DEFAULT_OBJECT + value.toString().length * eMemorySize.STRING_CHAR;
	}
}

export class TypedArraySizeStrategy implements ISizeStrategy {
	private readonly constructors = [
		Int8Array,
		Uint8Array,
		Uint8ClampedArray,
		Int16Array,
		Uint16Array,
		Int32Array,
		Uint32Array,
		Float32Array,
		Float64Array,
		BigInt64Array,
		BigUint64Array,
	];

	public supports(value: any): boolean {
		return this.constructors.some((ctor) => value instanceof ctor);
	}

	public sizeOf(value: ArrayBufferView, _profiler: IProfiler): number {
		return value.byteLength;
	}
}

export class ArrayBufferStrategy implements ISizeStrategy {
	public supports(value: any): boolean {
		return value instanceof ArrayBuffer;
	}

	public sizeOf(value: ArrayBuffer, _profiler: IProfiler): number {
		return value.byteLength;
	}
}

export class DataViewStrategy implements ISizeStrategy {
	public supports(value: any): boolean {
		return value instanceof DataView;
	}

	public sizeOf(value: DataView, _profiler: IProfiler): number {
		return value.byteLength;
	}
}

export class FunctionSizeStrategy implements ISizeStrategy {
	public supports(value: any): boolean {
		return typeof value === "function";
	}

	public sizeOf(fn: Function, profiler: IProfiler): number {
		const fnWithProps = fn as Function & { [key: string]: any };
		let size = eMemorySize.DEFAULT_FUNCTION;

		size += fn.toString().length * eMemorySize.STRING_CHAR;

		for (const key in fnWithProps) {
			if (Object.prototype.hasOwnProperty.call(fnWithProps, key)) {
				size += key.length * eMemorySize.STRING_CHAR;
				size += profiler.computeSize(fnWithProps[key]);
			}
		}

		if (fn.prototype && typeof fn.prototype === "object") size += profiler.computeSize(fn.prototype);

		return size;
	}
}

export class WeakRefStrategy implements ISizeStrategy {
	public supports(value: any): boolean {
		return value instanceof WeakRef;
	}

	public sizeOf(_value: any, _profiler: IProfiler): number {
		return eMemorySize.REFERENCE + eMemorySize.DEFAULT_WEAKREF;
	}
}

export class RegExpStrategy implements ISizeStrategy {
	public supports(value: any): boolean {
		return value instanceof RegExp;
	}

	public sizeOf(value: any, profiler: IProfiler): number {
		let size = eMemorySize.DEFAULT_REGEXP;

		size += value.source.length * eMemorySize.STRING_CHAR;
		size += value.flags.length * eMemorySize.STRING_CHAR;

		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key) && key !== "source" && key !== "flags" && key !== "lastIndex") {
				size += key.length * eMemorySize.STRING_CHAR;
				size += profiler.computeSize(value[key]);
			}
		}

		size += eMemorySize.NUMBER;

		return size;
	}
}

export class ArrayStrategy implements ISizeStrategy {
	public supports(value: any): boolean {
		return Array.isArray(value);
	}

	public sizeOf(value: any, profiler: IProfiler): number {
		let size = eMemorySize.DEFAULT_ARRAY;
		for (const item of value) size += profiler.computeSize(item);

		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key) && key !== "length") {
				size += key.length * eMemorySize.STRING_CHAR;
				size += profiler.computeSize(value[key]);
			}
		}

		return size;
	}
}

export class Profiler implements IProfiler {
	private visited = new WeakSet<object>();
	private strategies: ISizeStrategy[];

	constructor(options?: {
		strategies?: ISizeStrategy[];
	}) {
		const {
			strategies,
		} = options ?? {};

		this.strategies = strategies ?? [
			new ArrayStrategy(),
			new RegExpStrategy(),
			new WeakRefStrategy(),
			new URLSizeStrategy(),
			new TypedArraySizeStrategy(),
			new ArrayBufferStrategy(),
			new DataViewStrategy(),
			new FunctionSizeStrategy(),
			new DefaultSizeStrategy(),
		];
	}

	public sizeOf(value: any): number {
		this.visited = new WeakSet();
		return this.computeSize(value);
	}

	public computeSize(value: any): number {
		const strategy = this.strategies.find((s) => s.supports(value));
		if (!strategy) return 0;

		return strategy.sizeOf(value, this);
	}

	public isVisited(value: any): boolean {
		return typeof value === "object" && value !== null && this.visited.has(value);
	}

	public markVisited(value: any): void {
		typeof value === "object" && value !== null && this.visited.add(value);
	}

	public addStrategy(strategy: ISizeStrategy): void {
		this.strategies.unshift(strategy);
	}

	public computeDetailedSize(value: any): IMemoryReport {
		this.visited = new WeakSet();
		return this._computeDetailed(value);
	}

	private _computeDetailed(value: any): IMemoryReport {
		const type = Object.prototype.toString.call(value).slice(8, -1).toLowerCase();

		if (value === null || value === undefined) return { type, size: eMemorySize.UNDEFINED };
		if (typeof value === "string") return { type: "string", size: value.length * eMemorySize.STRING_CHAR };
		if (typeof value === "number") return { type: "number", size: eMemorySize.NUMBER };
		if (typeof value === "boolean") return { type: "boolean", size: eMemorySize.BOOLEAN };
		if (typeof value === "bigint") return { type: "bigint", size: eMemorySize.BIGINT };

		if (typeof value === "symbol") {
			return {
				type: "symbol",
				size: value.description ? value.description.length * eMemorySize.STRING_CHAR : 0,
			};
		}

		if (typeof value === "function") {
			if (this.isVisited(value)) return { type: "function", size: eMemorySize.REFERENCE };
			this.markVisited(value);

			let size = value.toString().length * eMemorySize.STRING_CHAR;
			const children: Record<string, IMemoryReport> = {};

			for (const key in value) {
				if (Object.prototype.hasOwnProperty.call(value, key)) {
					const child = this._computeDetailed(value[key]);
					size += key.length * eMemorySize.STRING_CHAR + child.size;
					children[key] = child;
				}
			}

			if (value.prototype && typeof value.prototype === "object") {
				const proto = this._computeDetailed(value.prototype);
				size += proto.size;
				children["prototype"] = proto;
			}

			return { type: "function", size, children };
		}

		if (this.isVisited(value)) return { type, size: eMemorySize.REFERENCE };
		this.markVisited(value);

		if (Array.isArray(value)) {
			let size = 0;
			const children: Record<string, IMemoryReport> = {};

			value.forEach((item, index) => {
				const detail = this._computeDetailed(item);
				children[index] = detail;
				size += detail.size;
			});

			return { type: "array", size, children };
		}

		if (value instanceof Map) {
			let size = 0;
			const children: Record<string, IMemoryReport> = {};

			for (const [k, v] of value) {
				const keyDetail = this._computeDetailed(k);
				const valDetail = this._computeDetailed(v);
				const keyStr = `key:${String(k)}`;
				const valStr = `val:${String(k)}`;
				children[keyStr] = keyDetail;
				children[valStr] = valDetail;
				size += keyDetail.size + valDetail.size;
			}

			return { type: "map", size, children };
		}

		if (value instanceof Set) {
			let size = 0;
			const children: Record<string, IMemoryReport> = {};

			let i = 0;
			for (const item of value) {
				const detail = this._computeDetailed(item);
				children[i++] = detail;
				size += detail.size;
			}

			return { type: "set", size, children };
		}

		if (Buffer.isBuffer(value)) return { type: "buffer", size: value.length };
		if (value instanceof Date) return { type: "date", size: eMemorySize.DATE };
		if (value instanceof RegExp) return { type: "regexp", size: value.toString().length * eMemorySize.STRING_CHAR };

		let size = 0;
		const children: Record<string, IMemoryReport> = {};

		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key)) {
				const child = this._computeDetailed(value[key]);
				size += key.length * eMemorySize.STRING_CHAR + child.size;
				children[key] = child;
			}
		}

		return { type: "object", size, children };
	}

	public static formatSize(bytes: number, unit: eMemoryUnit = eMemoryUnit.BYTE): string {
		switch (unit) {
			case eMemoryUnit.BYTE: return `${bytes} B`;
			case eMemoryUnit.KILOBYTE: return `${(bytes / 1024).toFixed(2)} KB`;
			case eMemoryUnit.MEGABYTE: return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
			case eMemoryUnit.GIGABYTE: return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
			default: return `${bytes} B`;
		}
	}
}