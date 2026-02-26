export class FileNotFoundError extends Error {
	path: string;
	constructor(filePath: string) {
		super(`File not found: ${filePath}`);
		this.name = "FileNotFoundError";
		this.path = filePath;
	}
}

export class PermissionError extends Error {
	path: string;
	constructor(filePath: string) {
		super(`Permission denied: ${filePath}`);
		this.name = "PermissionError";
		this.path = filePath;
	}
}

export class DirectoryNotEmptyError extends Error {
	path: string;
	constructor(dirPath: string) {
		super(`Directory not empty: ${dirPath}`);
		this.name = "DirectoryNotEmptyError";
		this.path = dirPath;
	}
}
