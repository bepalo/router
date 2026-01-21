import { status } from "./helpers";
import { Handler } from "./types";

/**
 * Context object containing parsed upload data from multipart/form-data requests.
 * @typedef {Object} CTXUpload
 * @property {Map<string, StreamingUploadedFile>} files - Map of field names to uploaded file information
 * @property {Map<string, string>} fields - Map of field names to string values
 * @property {string} [uploadId] - Optional identifier for the upload session
 */
export type CTXUpload = {
  files: Map<string, StreamingUploadedFile>; // Field name -> array of files
  fields: Map<string, string>; // Field name -> array of values
  uploadId?: string; // Optional identifier for the upload
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
  name: string; // Original filename
  type: string; // MIME type
  size: number; // Size in bytes
  customFilename?: string; // Custom filename if provided by onFileStart
  metadata?: Record<string, any>; // Additional metadata
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
  maxTotalSize?: number; // Maximum total request size
  maxFileSize?: number; // Maximum size per file
  maxFiles?: number; // Maximum number of files
  maxFields?: number; // Maximum number of text fields
  allowedTypes?: string[]; // Allowed MIME types
  uploadIdGenerator?: () => string | Promise<string>; // Generate upload ID

  // Event handlers
  onUploadStart?: (uploadId: string, totalSize: number) => Promise<void>;
  onUploadComplete?: (uploadId: string, success: boolean) => Promise<void>;

  // File event handlers
  onFileStart?: (
    uploadId: string,
    fieldName: string,
    fileName: string,
    contentType: string,
    fileSize?: number,
  ) => Promise<{
    customFilename?: string;
    metadata?: Record<string, any>;
  } | void>;

  onFileChunk?: (
    uploadId: string,
    fieldName: string,
    fileName: string,
    chunk: Uint8Array,
    offset: number,
    isLast: boolean,
  ) => Promise<void>;

  onFileComplete?: (
    uploadId: string,
    fieldName: string,
    fileName: string,
    fileSize: number,
    customFilename?: string,
    metadata?: Record<string, any>,
  ) => Promise<void>;

  onFileError?: (
    uploadId: string,
    fieldName: string,
    fileName: string,
    error: Error,
  ) => Promise<void>;

  // Field event handlers
  onField?: (
    uploadId: string,
    fieldName: string,
    value: string,
  ) => Promise<void>;

  // Error handler
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
export const parseUploadStreaming = <Context extends CTXUpload>(
  options?: StreamingUploadOptions,
): Handler<Context> => {
  const {
    maxTotalSize = 100 * 1024 * 1024, // 100MB default
    maxFileSize = 20 * 1024 * 1024, // 20MB per file
    maxFiles = 50,
    maxFields = 1000,
    allowedTypes,
    uploadIdGenerator = () =>
      `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    onUploadStart,
    onUploadComplete,
    onFileStart,
    onFileChunk,
    onFileComplete,
    onFileError,
    onField,
    onError,
  } = options || {};

  return async (req: Request, ctx: Context) => {
    const contentType = req.headers.get("content-type");

    // Check if it's multipart/form-data
    if (!contentType?.startsWith("multipart/form-data")) {
      return status(415, "Expected multipart/form-data");
    }

    // Get boundary from content-type
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      return status(400, "Missing boundary in Content-Type");
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];

    // Generate upload ID
    const uploadId = await uploadIdGenerator();
    ctx.uploadId = uploadId;
    ctx.files = new Map();
    ctx.fields = new Map();

    try {
      const reader = req.body?.getReader();
      if (!reader) {
        throw new Error("No request body");
      }

      // Initialize tracking
      let buffer = new Uint8Array();
      let totalRead = 0;
      let fileCount = 0;
      let fieldCount = 0;
      let currentPart: {
        headers: Map<string, string>;
        fieldName?: string;
        fileName?: string;
        contentType?: string;
        customFilename?: string;
        metadata?: Record<string, any>;
        bytesRead: number;
        isProcessing: boolean;
      } | null = null;

      const boundaryBytes = new TextEncoder().encode(`--${boundary}`);
      const boundaryEndBytes = new TextEncoder().encode(`--${boundary}--`);
      const crlfBytes = new TextEncoder().encode("\r\n");
      const headerEndBytes = new TextEncoder().encode("\r\n\r\n");

      // Notify upload start
      if (onUploadStart) {
        const contentLength = req.headers.get("content-length");
        await onUploadStart(
          uploadId,
          contentLength ? parseInt(contentLength) : 0,
        );
      }

      // Process streaming data
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalRead += value.length;
        if (totalRead > maxTotalSize) {
          await reader.cancel();
          throw new Error(
            `Request exceeds maximum size of ${maxTotalSize} bytes`,
          );
        }

        // Add new data to buffer
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        // Process while we have data
        let processed = false;
        do {
          processed = false;

          if (!currentPart) {
            // Look for boundary to start new part
            const boundaryIndex = findSequence(buffer, boundaryBytes);
            if (boundaryIndex !== -1) {
              // Check if this is the closing boundary
              const isClosingBoundary =
                buffer.length >= boundaryIndex + boundaryBytes.length + 2 &&
                buffer[boundaryIndex + boundaryBytes.length] === 45 && // '-'
                buffer[boundaryIndex + boundaryBytes.length + 1] === 45; // '-'

              if (isClosingBoundary) {
                // End of multipart data
                buffer = buffer.slice(boundaryIndex + boundaryEndBytes.length);
                break;
              }

              // Remove boundary and look for headers
              buffer = buffer.slice(boundaryIndex + boundaryBytes.length);

              // Look for header end
              const headerEndIndex = findSequence(buffer, headerEndBytes);
              if (headerEndIndex !== -1) {
                const headerBytes = buffer.slice(0, headerEndIndex);
                const headers = parseHeaders(
                  new TextDecoder().decode(headerBytes),
                );

                // Parse content-disposition
                const contentDisposition = headers.get("content-disposition");
                if (contentDisposition) {
                  const dispositionParams =
                    parseDisposition(contentDisposition);
                  const fieldName = dispositionParams.get("name");
                  const fileName = dispositionParams.get("filename");
                  const contentType =
                    headers.get("content-type") || "application/octet-stream";
                  if (fieldName) {
                    currentPart = {
                      headers,
                      fieldName,
                      fileName,
                      contentType,
                      bytesRead: 0,
                      isProcessing: false,
                    };
                    // Remove headers from buffer
                    buffer = buffer.slice(
                      headerEndIndex + headerEndBytes.length,
                    );
                    // Start processing this part
                    processed = true;
                  }
                }
              }
            }
          }

          if (currentPart && !currentPart.isProcessing) {
            // Initialize part processing
            currentPart.isProcessing = true;

            if (currentPart.fileName) {
              // This is a file
              fileCount++;
              if (fileCount > maxFiles) {
                throw new Error(
                  `Maximum number of files (${maxFiles}) exceeded`,
                );
              }
              if (
                allowedTypes &&
                !allowedTypes.includes(currentPart.contentType!)
              ) {
                throw new Error(
                  `File type ${currentPart.contentType} not allowed`,
                );
              }
              // Call onFileStart
              if (onFileStart) {
                try {
                  const result = await onFileStart(
                    uploadId,
                    currentPart.fieldName!,
                    currentPart.fileName,
                    currentPart.contentType!,
                  );
                  if (result) {
                    currentPart.customFilename = result.customFilename;
                    currentPart.metadata = result.metadata;
                  }
                } catch (error) {
                  if (onFileError) {
                    await onFileError(
                      uploadId,
                      currentPart.fieldName!,
                      currentPart.fileName,
                      error as Error,
                    );
                  }
                  currentPart = null;
                  continue;
                }
              }

              // Add to ctx.files
              ctx.files.set(currentPart.fieldName!, {
                name: currentPart.fileName,
                type: currentPart.contentType!,
                size: 0, // Will be updated as we read
                customFilename: currentPart.customFilename,
                metadata: currentPart.metadata,
              });
            } else {
              // This is a text field
              fieldCount++;
              if (fieldCount > maxFields) {
                throw new Error(
                  `Maximum number of fields (${maxFields}) exceeded`,
                );
              }
            }
          }

          if (currentPart && currentPart.isProcessing) {
            // Process part data until we hit a boundary
            const boundaryIndex = findSequence(buffer, boundaryBytes);

            if (boundaryIndex !== -1) {
              // We found the next boundary
              // Check for CRLF before boundary (it should be there)
              let dataEnd = boundaryIndex;
              if (boundaryIndex >= 2) {
                // Check if there's a CRLF before the boundary
                if (
                  buffer[boundaryIndex - 2] === 13 &&
                  buffer[boundaryIndex - 1] === 10
                ) {
                  dataEnd = boundaryIndex - 2; // Exclude the CRLF
                }
              }

              const partData = buffer.slice(0, dataEnd);

              if (currentPart.fileName) {
                // Process file chunk
                if (partData.length > 0) {
                  currentPart.bytesRead += partData.length;

                  // Check file size limit
                  if (currentPart.bytesRead > maxFileSize) {
                    throw new Error(
                      `File ${currentPart.fileName} exceeds maximum size of ${maxFileSize} bytes`,
                    );
                  }

                  // Update file size in context
                  const file = ctx.files.get(currentPart.fieldName!)!;
                  file.size = currentPart.bytesRead;

                  // Call onFileChunk
                  if (onFileChunk) {
                    await onFileChunk(
                      uploadId,
                      currentPart.fieldName!,
                      currentPart.fileName,
                      partData,
                      currentPart.bytesRead - partData.length,
                      true, // This is the last chunk for this file
                    );
                  }

                  // Call onFileComplete
                  if (onFileComplete) {
                    await onFileComplete(
                      uploadId,
                      currentPart.fieldName!,
                      currentPart.fileName,
                      currentPart.bytesRead,
                      currentPart.customFilename,
                      currentPart.metadata,
                    );
                  }
                }
              } else {
                // Process text field
                if (partData.length > 0) {
                  const value = new TextDecoder().decode(partData);

                  // Add to context
                  ctx.fields.set(currentPart.fieldName!, value);

                  // Call onField
                  if (onField) {
                    await onField(uploadId, currentPart.fieldName!, value);
                  }
                }
              }

              // Move buffer past processed data and boundary
              buffer = buffer.slice(boundaryIndex);
              currentPart = null;
              processed = true;
            } else {
              // No boundary found yet
              // Process what we have in buffer (but leave enough bytes for a potential boundary)
              const minBoundaryLength = boundaryBytes.length;

              // Only process if we have significantly more data than boundary length
              if (buffer.length > minBoundaryLength * 2) {
                // Process chunks, but keep enough in buffer to detect boundary
                const chunkSize = buffer.length - minBoundaryLength;

                if (currentPart.fileName && chunkSize > 0) {
                  const partData = buffer.slice(0, chunkSize);
                  currentPart.bytesRead += partData.length;

                  // Check file size limit
                  if (currentPart.bytesRead > maxFileSize) {
                    throw new Error(
                      `File ${currentPart.fileName} exceeds maximum size of ${maxFileSize} bytes`,
                    );
                  }

                  // Update file size in context
                  const file = ctx.files.get(currentPart.fieldName!)!;
                  file.size = currentPart.bytesRead;

                  // Call onFileChunk
                  if (onFileChunk) {
                    await onFileChunk(
                      uploadId,
                      currentPart.fieldName!,
                      currentPart.fileName,
                      partData,
                      currentPart.bytesRead - partData.length,
                      false, // Not the last chunk
                    );
                  }

                  // Move buffer past processed data
                  buffer = buffer.slice(chunkSize);
                  processed = true;
                }
              }
            }
          }
        } while (processed);
      }

      // Process any remaining data in buffer (for the last part)
      if (currentPart && buffer.length > 0) {
        if (currentPart.fileName) {
          // Process remaining file data
          currentPart.bytesRead += buffer.length;

          // Check file size limit
          if (currentPart.bytesRead > maxFileSize) {
            throw new Error(
              `File ${currentPart.fileName} exceeds maximum size of ${maxFileSize} bytes`,
            );
          }

          // Update file size in context
          const file = ctx.files.get(currentPart.fieldName!)!;
          file.size = currentPart.bytesRead;

          // Call onFileChunk for last chunk
          if (onFileChunk) {
            await onFileChunk(
              uploadId,
              currentPart.fieldName!,
              currentPart.fileName,
              buffer,
              currentPart.bytesRead - buffer.length,
              true,
            );
          }

          // Call onFileComplete
          if (onFileComplete) {
            await onFileComplete(
              uploadId,
              currentPart.fieldName!,
              currentPart.fileName,
              currentPart.bytesRead,
              currentPart.customFilename,
              currentPart.metadata,
            );
          }
        } else {
          // Process remaining text field data
          const value = new TextDecoder().decode(buffer);

          // Add to context
          ctx.fields.set(currentPart.fieldName!, value);

          // Call onField
          if (onField) {
            await onField(uploadId, currentPart.fieldName!, value);
          }
        }
      }

      // Notify upload completion
      if (onUploadComplete) {
        await onUploadComplete(uploadId, true);
      }
    } catch (error: any) {
      // Notify upload completion with failure
      if (onUploadComplete) {
        await onUploadComplete(uploadId, false).catch(() => {});
      }

      // Call error handler
      if (onError) {
        await onError(uploadId, error).catch(() => {});
      }

      console.error("Upload parsing error:", error);

      if (error.message.includes("exceeds maximum")) {
        return status(413, error.message);
      }
      if (error.message.includes("not allowed")) {
        return status(415, error.message);
      }
      if (error.message.includes("exceeded")) {
        return status(400, error.message);
      }

      return status(400, "Failed to parse upload");
    }
  };
};

/**
 * Helper function to find a byte sequence within a buffer.
 * Performs a linear search for the sequence in the buffer.
 *
 * @private
 * @param {Uint8Array} buffer - The buffer to search within
 * @param {Uint8Array} sequence - The byte sequence to find
 * @returns {number} The index of the sequence, or -1 if not found
 */
function findSequence(buffer: Uint8Array, sequence: Uint8Array): number {
  if (buffer.length < sequence.length) return -1;

  // Use a more efficient search algorithm for large buffers
  for (let i = 0; i <= buffer.length - sequence.length; i++) {
    let found = true;
    for (let j = 0; j < sequence.length; j++) {
      if (buffer[i + j] !== sequence[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}

/**
 * Helper function to parse HTTP headers from text.
 *
 * @private
 * @param {string} headerText - Raw header text with CRLF separators
 * @returns {Map<string, string>} Map of lowercase header names to values
 */
function parseHeaders(headerText: string): Map<string, string> {
  const headers = new Map<string, string>();
  const lines = headerText.split("\r\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();
      headers.set(key, value);
    }
  }
  return headers;
}

/**
 * Helper function to parse content-disposition header parameters.
 *
 * @private
 * @param {string} disposition - Content-disposition header value
 * @returns {Map<string, string>} Map of parameter names to values
 */
function parseDisposition(disposition: string): Map<string, string> {
  const params = new Map<string, string>();
  const parts = disposition.split(";").map((p) => p.trim());

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const eqIndex = part.indexOf("=");
    if (eqIndex !== -1) {
      let key = part.slice(0, eqIndex).trim();
      let value = part.slice(eqIndex + 1).trim();

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      params.set(key, value);
    }
  }

  return params;
}
