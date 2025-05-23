import { Profiler } from '../src/index';
import { URL } from "url";
import { eMemorySize, eMemoryUnit } from '../src/weigh/enum';

describe("Profiler", () => {
	let profiler: Profiler;

	beforeEach(() => {
		profiler = new Profiler();
	});

	test("should calculate primitive types", () => {
		expect(profiler.sizeOf(true)).toBe(eMemorySize.BOOLEAN);
		expect(profiler.sizeOf(42)).toBe(eMemorySize.NUMBER);
		expect(profiler.sizeOf(BigInt(123456789))).toBe(eMemorySize.BIGINT);
		expect(profiler.sizeOf(undefined)).toBe(eMemorySize.UNDEFINED);
		expect(profiler.sizeOf(null)).toBe(eMemorySize.NULL);
	});

	test("should calculate string size", () => {
		expect(profiler.sizeOf("test")).toBe(4 * eMemorySize.STRING_CHAR);
		expect(profiler.computeDetailedSize("hello")).toEqual({
			type: "string",
			size: 5 * eMemorySize.STRING_CHAR,
		});
	});

	test("should calculate symbol size", () => {
		const sym = Symbol("desc");
		expect(profiler.sizeOf(sym)).toBe("desc".length * eMemorySize.STRING_CHAR);
	});

	test("should calculate array size", () => {
		const someStr = "abcdefghijklmnstopqwdxyz1234567890-"
		const arr = [1, someStr, true];
		const expectedSize = eMemorySize.NUMBER + someStr.length * eMemorySize.STRING_CHAR + eMemorySize.BOOLEAN;
		expect(profiler.sizeOf(arr)).toBe(expectedSize);
	});

	test("should calculate array with zero size", () => {
		expect(profiler.sizeOf([])).toBe(0);
	});

	test("should calculate object size", () => {
		const obj = {
			name: "John",
			age: 30,
			isAdmin: false,
		};

		const expectedSize =
			"name".length * eMemorySize.STRING_CHAR + "John".length * eMemorySize.STRING_CHAR +
			"age".length * eMemorySize.STRING_CHAR + eMemorySize.NUMBER +
			"isAdmin".length * eMemorySize.STRING_CHAR + eMemorySize.BOOLEAN

		expect(profiler.sizeOf(obj)).toBe(expectedSize);
	});

	test("should calculate empty object", () => {
		expect(profiler.sizeOf({})).toBe(0);
	});

	test("should handle circular references", () => {
		const obj: any = {};
		obj.self = obj;

		expect(profiler.sizeOf(obj)).toBe("self".length * eMemorySize.STRING_CHAR + eMemorySize.REFERENCE);
	});

	test("should calculate Map size", () => {
		const map = new Map();
		map.set("key", 123);

		const expectedSize =
			"key".length * eMemorySize.STRING_CHAR + eMemorySize.NUMBER;

		expect(profiler.sizeOf(map)).toBe(expectedSize);
	});

	test("should calculate Set size", () => {
		const set = new Set([1, 2, 3]);
		expect(profiler.sizeOf(set)).toBe(3 * eMemorySize.NUMBER);
	});

	test("should calculate URL size", () => {
		const profiler = new Profiler();
		const url = new URL("https://example.com");
		const expectedSize = url.toString().length * eMemorySize.STRING_CHAR;
		expect(profiler.sizeOf(url)).toBe(expectedSize);
	});

	test("should calculate Buffer size", () => {
		const buffer = Buffer.from("hello");
		expect(profiler.sizeOf(buffer)).toBe(5);
	});

	test("should format size", () => {
		expect(Profiler.formatSize(1024, eMemoryUnit.BYTE)).toBe("1024 B");
		expect(Profiler.formatSize(1024, eMemoryUnit.KILOBYTE)).toBe("1.00 KB");
		expect(Profiler.formatSize(1024 ** 2, eMemoryUnit.MEGABYTE)).toBe("1.00 MB");
		expect(Profiler.formatSize(1024 ** 3, eMemoryUnit.GIGABYTE)).toBe("1.00 GB");
	});

	test("should calculate function size", () => {
		function testFunc() {
			return 1;
		}

		const size = profiler.sizeOf(testFunc);
		expect(typeof size).toBe("number");
		expect(size).toBeGreaterThan(0);
	});

	test("should calculate typed array size", () => {
		const arr = new Int16Array(10); // 10 * 2 bytes
		expect(profiler.sizeOf(arr)).toBe(arr.byteLength);
	});

	test("should calculate ArrayBuffer size", () => {
		const buffer = new ArrayBuffer(16);
		expect(profiler.sizeOf(buffer)).toBe(16);
	});

	test("should calculate DataView size", () => {
		const buffer = new ArrayBuffer(16);
		const view = new DataView(buffer);
		expect(profiler.sizeOf(view)).toBe(16);
	});
});