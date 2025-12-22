---
title: Multipart
sidebar_position: 3
---

## Efficient Multipart Data Handling in Minima\.js

**Installation:**

```bash npm2yarn
npm install @minimajs/multipart
```

- **Targeted File Access:**

  The `multipart.file(field: string)` function retrieves a specific file from the multipart request based on its field name.

  ```typescript
  import { multipart } from "@minimajs/multipart";

  async function handleFile(fieldName: string) {
    const uploadedFile = await multipart.file(fieldName);
    const fileBuffer = await uploadedFile.buffer();
    // Process the file buffer as needed...
  }
  ```

- **Iterating Over Multiple Files:**

  The `multipart.files()` function provides an asynchronous iterator that allows you to efficiently process each uploaded file sequentially.

  ```typescript
  import { multipart } from "@minimajs/multipart";

  async function handleMultipleFiles() {
    for await (const file of multipart.files()) {
      console.log(`Received file: ${file.name}`);
      // Process each uploaded file...
    }
  }
  ```

- **Retrieving Form Field Values:**

  The `multipart.fields()` function returns a promise that resolves to a `Record<string, unknown>`, providing access to all submitted form fields and their corresponding values.

  ```typescript
  import { multipart } from "@minimajs/multipart";

  async function handleFormFields() {
    const formData = await multipart.fields();
    const username = formData.username as string; // Type casting for clarity
    const email = formData.email as string;
    // Process form data as required...
  }
  ```

- **Direct Body Access:**

  The `multipart.body()` function returns an asynchronous iterator that yields an array containing the field name and its corresponding value (which can be a string or a `File` object). This offers maximum flexibility for handling all parts of the request body.

  ```typescript
  import { multipart } from "@minimajs/multipart";

  async function handleRequestBody() {
    for await (const [fieldName, fieldValue] of multipart.body()) {
      if (typeof fieldValue === "string") {
        console.log(`Field: ${fieldName}, Value: ${fieldValue}`);
      } else {
        console.log(`File uploaded: ${fieldValue.name}`);
        // Handle file upload...
      }
    }
  }
  ```

**Example: Robust File Upload Handling**

```typescript
import { createWriteStream } from "node:fs";
import { pipeline } from "stream/promises";
import { multipart } from "@minimajs/multipart";

async function handleFileUpload() {
  for await (const file of multipart.files()) {
    const writeStream = createWriteStream(file.name);
    await pipeline(file.stream, writeStream);
  }
  return "Files uploaded successfully!";
}
```

- **File Class:**

  This class encapsulates the information and functionality related to uploaded files.

- **Properties:**

  - `field`: The name of the form field associated with the uploaded file. (Readonly)
  - `filename`: The original filename of the uploaded file. (Readonly)
  - `encoding`: The character encoding of the file content. (Readonly)
  - `mimeType`: The MIME type of the file content. (Readonly)
  - `stream`: A readable stream representing the file content. (Readonly)
  - `ext`: Getter property that retrieves the file extension from the filename.

- **Methods:**

  - `get stream()`: Ensures the existence of the stream before returning it. (Readonly)
  - `buffer()`: Reads the entire file content into a buffer.
  - `async move(dir = process.cwd(), filename?: string)`: Moves the uploaded file to the specified directory with an optional new filename.
  - `flush()`: Discards the remaining content of the stream.

- **isFile Function:**

  This function checks if a given object is an instance of the `File` class.
