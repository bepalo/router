import { Handler } from "./types";
/**
 * Context object containing parsed upload data from multipart/form-data requests.
 * @typedef {Object} CTXUpload
 * @property {Map<string, StreamingUploadedFile>} files - Map of field names to uploaded file information
 * @property {Map<string, string>} fields - Map of field names to string values
 * @property {string} [uploadId] - Optional identifier for the upload session
 */
export type CTXUpload = {
    files: Map<string, StreamingUploadedFile>;
    fields: Map<string, string>;
    uploadId?: string;
};
/**
 * Represents a file uploaded via streaming multipart/form-data.
 * @typedef {Object} StreamingUploadedFile
 * @property {string} name - Original filename from the upload
 * @property {string} type - MIME type of the file
 * @property {number} size - Size of the file in bytes
 * @property {string} [customFilename] - Custom filename if provided by onFileStart handler
 * @property {Record<string, any>} [metadata] - Additional metadata for the file
 */
export type StreamingUploadedFile = {
    name: string;
    type: string;
    size: number;
    customFilename?: string;
    metadata?: Record<string, any>;
};
/**
 * Configuration options for streaming multipart upload parsing.
 * @typedef {Object} StreamingUploadOptions
 * @property {number} [maxTotalSize=100*1024*1024] - Maximum total request size in bytes (default: 100MB)
 * @property {number} [maxFileSize=20*1024*1024] - Maximum size per file in bytes (default: 20MB)
 * @property {number} [maxFiles=50] - Maximum number of files allowed
 * @property {number} [maxFields=1000] - Maximum number of text fields allowed
 * @property {string[]} [allowedTypes] - Array of allowed MIME types (if not provided, all types are allowed)
 * @property {Function} [uploadIdGenerator] - Function that generates a unique upload ID
 *
 * @property {Function} [onUploadStart] - Called when upload starts
 * @property {Function} [onUploadComplete] - Called when upload completes (successfully or not)
 *
 * @property {Function} [onFileStart] - Called when a file upload starts
 * @property {Function} [onFileChunk] - Called for each chunk of file data
 * @property {Function} [onFileComplete] - Called when a file upload completes
 * @property {Function} [onFileError] - Called when a file upload encounters an error
 *
 * @property {Function} [onField] - Called when a text field is parsed
 * @property {Function} [onError] - Called when the overall upload encounters an error
 */
export type StreamingUploadOptions = {
    maxTotalSize?: number;
    maxFileSize?: number;
    maxFiles?: number;
    maxFields?: number;
    allowedTypes?: string[];
    uploadIdGenerator?: () => string | Promise<string>;
    onUploadStart?: (uploadId: string, totalSize: number) => Promise<void>;
    onUploadComplete?: (uploadId: string, success: boolean) => Promise<void>;
    onFileStart?: (uploadId: string, fieldName: string, fileName: string, contentType: string, fileSize?: number) => Promise<{
        customFilename?: string;
        metadata?: Record<string, any>;
    } | void>;
    onFileChunk?: (uploadId: string, fieldName: string, fileName: string, chunk: Uint8Array, offset: number, isLast: boolean) => Promise<void>;
    onFileComplete?: (uploadId: string, fieldName: string, fileName: string, fileSize: number, customFilename?: string, metadata?: Record<string, any>) => Promise<void>;
    onFileError?: (uploadId: string, fieldName: string, fileName: string, error: Error) => Promise<void>;
    onField?: (uploadId: string, fieldName: string, value: string) => Promise<void>;
    onError?: (uploadId: string, error: Error) => Promise<void>;
};
/**
 * Creates a middleware function for streaming multipart/form-data upload parsing.
 * This function processes uploads in chunks as they arrive, allowing for handling
 * of large files without buffering the entire request in memory.
 *
 * @param {StreamingUploadOptions} [options] - Configuration options for upload parsing
 * @returns {Function} A middleware function that adds uploaded files and fields to context
 * @throws {Response} Returns a 415 response if content-type is not multipart/form-data
 * @throws {Response} Returns a 400 response if boundary is missing in Content-Type
 * @throws {Response} Returns a 413 response if request or file exceeds size limits
 * @throws {Response} Returns a 415 response if file type is not allowed
 * @throws {Response} Returns a 400 response if maximum file/field count is exceeded
 *
 * @example
 * const uploadHandler = parseUploadStreaming({
 *   maxFileSize: 10 * 1024 * 1024, // 10MB
 *   allowedTypes: ['image/jpeg', 'image/png'],
 *   onFileStart: async (uploadId, fieldName, fileName, contentType) => {
 *     console.log(`Starting upload: ${fileName}`);
 *     return { customFilename: `custom_${Date.now()}_${fileName}` };
 *   },
 *   onFileChunk: async (uploadId, fieldName, fileName, chunk, offset, isLast) => {
 *     console.log(`Received chunk for ${fileName}: ${chunk.length} bytes at offset ${offset}`);
 *   }
 * });
 *
 * // Use in respondWith:
 * const handler = respondWith({}, uploadHandler, (req, ctx) => {
 *   return json({
 *     uploadId: ctx.uploadId,
 *     files: Array.from(ctx.files.entries()),
 *     fields: Array.from(ctx.fields.entries())
 *   });
 * });
 */
export declare const parseUploadStreaming: <Context extends CTXUpload>(options?: StreamingUploadOptions) => Handler<Context>;
//# sourceMappingURL=upload-stream.d.ts.map