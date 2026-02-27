export class FileNotFoundError extends Error {
	path: string;
	constructor(filePath: string, options?: ErrorOptions) {
		super(`File not found: ${filePath}`, options);
		this.name = "FileNotFoundError";
		this.path = filePath;
	}
}

export class PermissionError extends Error {
	path: string;
	constructor(filePath: string, options?: ErrorOptions) {
		super(`Permission denied: ${filePath}`, options);
		this.name = "PermissionError";
		this.path = filePath;
	}
}

export class DirectoryNotEmptyError extends Error {
	path: string;
	constructor(dirPath: string, options?: ErrorOptions) {
		super(`Directory not empty: ${dirPath}`, options);
		this.name = "DirectoryNotEmptyError";
		this.path = dirPath;
	}
}
