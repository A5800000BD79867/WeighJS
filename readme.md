# WeighJS - JavaScript Object Memory Scale

A lightweight TypeScript library for estimating memory usage by JavaScript objects.
>**This will always be an approximate value due to the peculiarities of the JavaScript code execution environment as well as the optimizations applied.**

## ✨ Features  
- Accurate (as much as possible) memory estimation for JS/TS objects
- Support for all standard JavaScript types
- Support for exotic types such as Weak Map\Set, etc.
- Support for deep objects
- Support for circular dependency of objects
- Extensibility with custom strategies
- Detailed object memory analysis with keys
- Ease of use
- No dependencies

## 📦 Installation  

```bash
npm install weigh-js
# or  
yarn add weigh-js  
```  

## 🚀 Basic Usage  

```typescript
import { Profiler } from 'weigh-js';

const profiler = new Profiler();
const myObject = { /* ... */ };

// Get total memory in bytes  
const memoryUsage = profiler.sizeOf(myObject);  

// Get detailed report  
const report = profiler.computeDetailedSize(myObject);  

// Format for display  
console.log(`Memory used: ${Profiler.formatSize(memoryUsage)}`);  
```

## 📋 Supported Types  

| Type | Support |
|------|------------------|
| Boolean | ✅ |
| Number | ✅ |
| BigInt | ✅ |
| String | ✅ |
| Array | ✅ |
| Object | ✅ |
| Map | ✅ |
| Set | ✅ |
| Buffer | ✅ |
| Int8Array | ✅ |
| Uint8Array | ✅ |
| Uint8ClampedArray | ✅ |
| Int16Array | ✅ |
| Uint16Array | ✅ |
| Int32Array | ✅ |
| Uint32Array | ✅ |
| Float32Array | ✅ |
| Float64Array | ✅ |
| BigInt64Array | ✅ |
| BigUint64Array | ✅ |
| Weak Map | ✅ |
| Weak Set | ✅ |
| Weak Ref | ✅ |
| Array Buffer | ✅ |
| DataView | ✅ |
| Function | ✅ |
| Symbol | ✅ |
| Date | ✅ |
| RegExp | ✅ |
| Null | ✅ |
| Undefined | ✅ |

## 🛠️ Advanced Usage  

```typescript
// Custom strategy example
class MockStrategy implements ISizeStrategy {
	public supports(value: any): boolean {
		return value && value.__mockSize !== undefined;
	}

	public sizeOf(value: any, _profiler: IProfiler): number {
		return value.__mockSize;
	}
}

const profiler = new Profiler({
		strategies: [
			new MockStrategy()
		]
	});
```

## 🔗 Links  

- [GitHub](https://github.com/A5800000BD79867/WeighJS)  
- [Issues](https://github.com/A5800000BD79867/WeighJS/issues)  
- [NPM](https://www.npmjs.com/package/weigh-js)  

---

**WeighJS** | [MIT License](LICENSE)