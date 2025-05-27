import { Profiler, RegExpStrategy } from '../src/index';
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

		let propSize = 0;

		for (const key in arr) {
			if (Object.prototype.hasOwnProperty.call(arr, key) && key !== "length") {
				propSize += key.length * eMemorySize.STRING_CHAR;
				propSize += profiler.computeSize(arr[key]);
			}
		}

		const expectedSize = eMemorySize.DEFAULT_ARRAY + propSize + eMemorySize.NUMBER + (someStr.length * eMemorySize.STRING_CHAR) + eMemorySize.BOOLEAN;
		expect(profiler.sizeOf(arr)).toBe(expectedSize);
	});

	test("should calculate array with zero size", () => {
		expect(profiler.sizeOf([])).toBe(eMemorySize.DEFAULT_ARRAY);
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
			"isAdmin".length * eMemorySize.STRING_CHAR + eMemorySize.BOOLEAN +
			eMemorySize.DEFAULT_OBJECT

		expect(profiler.sizeOf(obj)).toBe(expectedSize);
	});

	test("should calculate empty object", () => {
		expect(profiler.sizeOf({})).toBe(eMemorySize.DEFAULT_OBJECT);
	});

	test("should handle circular references", () => {
		const obj: any = {};
		const key = 'self';
		obj[key] = obj;

		expect(profiler.sizeOf(obj)).toBe(key.length * eMemorySize.STRING_CHAR + eMemorySize.REFERENCE + eMemorySize.DEFAULT_OBJECT);
	});

	test("should calculate Map size", () => {
		const map = new Map();
		const key = 'key';
		map.set(key, 123);

		const expectedSize = eMemorySize.DEFAULT_MAP + key.length * eMemorySize.STRING_CHAR + eMemorySize.NUMBER;

		expect(profiler.sizeOf(map)).toBe(expectedSize);
	});

	test("should calculate Set size", () => {
		const set = new Set([1, 2, 3]);
		expect(profiler.sizeOf(set)).toBe(3 * eMemorySize.NUMBER + eMemorySize.DEFAULT_SET);
	});

	test("should calculate URL size", () => {
		const url = new URL("https://example.com");
		const expectedSize = eMemorySize.DEFAULT_OBJECT + url.toString().length * eMemorySize.STRING_CHAR;
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

		const prototypeSize = testFunc.prototype && typeof testFunc.prototype === 'object' ? profiler.sizeOf(testFunc.prototype) : 0;

		expect(typeof size).toBe("number");
		expect(size).toBeGreaterThan(0);
		expect(size).toBe(testFunc.toString().length * eMemorySize.STRING_CHAR + eMemorySize.DEFAULT_FUNCTION + prototypeSize);
	});

	test("should calculate function size with custom property", () => {
		const testFunc = function () {
			return 1;
		}

		const key1 = 'key1';
		const key2 = 'key2';

		testFunc[key1] = 1235.5555;
		testFunc[key2] = 'test value';

		const someNumberSize = (eMemorySize.STRING_CHAR * key1.length) + eMemorySize.NUMBER;
		const someStrSize = (key2.length * eMemorySize.STRING_CHAR) + (testFunc[key2].length * eMemorySize.STRING_CHAR);
		const rawFuncSize = testFunc.toString().length * eMemorySize.STRING_CHAR + eMemorySize.DEFAULT_FUNCTION;
		const protoypeSize = testFunc.prototype && typeof testFunc.prototype === 'object' ? profiler.sizeOf(testFunc.prototype) : 0;

		const size = profiler.sizeOf(testFunc);
		expect(typeof size).toBe("number");
		expect(size).toBeGreaterThan(0);
		expect(size).toBe(rawFuncSize + someNumberSize + someStrSize + protoypeSize);
	});

	test("should calculate array funciton size", () => {
		const test = () => {
			return 555;
		}

		const size = profiler.sizeOf(test);
		expect(size).toBe(test.toString().length * eMemorySize.STRING_CHAR + eMemorySize.DEFAULT_FUNCTION);
	});

	test("should calculate typed array size", () => {
		const arr = new Int16Array(10);
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

	it('should correctly calculate the size of a simple RegExp', () => {
		const regex = /abc/gi;

		const expectedSize =
			eMemorySize.DEFAULT_REGEXP +
			regex.source.length * eMemorySize.STRING_CHAR +
			regex.flags.length * eMemorySize.STRING_CHAR +
			eMemorySize.NUMBER;

		const size = profiler.sizeOf(regex);

		expect(size).toBe(expectedSize);
	});

	it('should include custom properties in the size calculation', () => {
		const regex: any = /test/i;
		const key = 'key1';

		regex[key] = '1234';

		const expectedSize =
			eMemorySize.DEFAULT_REGEXP +
			regex.source.length * eMemorySize.STRING_CHAR +
			regex.flags.length * eMemorySize.STRING_CHAR +
			eMemorySize.NUMBER +
			key.length * eMemorySize.STRING_CHAR +
			regex[key].length * eMemorySize.STRING_CHAR;

		const size = profiler.sizeOf(regex);

		expect(size).toBe(expectedSize);
	});
});