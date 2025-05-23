export interface IMemoryReport {
	type: string;
	size: number;
	children?: { [key: string]: IMemoryReport };
}

export interface ISizeStrategy {
	supports(value: any): boolean;
	sizeOf(value: any, profiler: IProfiler): number;
	detailedSizeOf?(value: any, profiler: IProfiler): IMemoryReport;
}

export interface IProfiler {
	isVisited(value: any): boolean;
	markVisited(value: any): void;
	computeSize(value: any): number;
}