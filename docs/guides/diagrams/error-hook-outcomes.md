```mermaid
graph TB
    Start[Error Thrown] --> Hook{Error Hook}

    Hook -->|1. Re-throw/abort| NextHook[Next Error Hook<br/>or app.errorHandler]
    Hook -->|2. Return data| Success[200 OK Response<br/>✅ Chain stops]
    Hook -->|3. Return Response| Direct[Send Response<br/>⚠️ Bypasses plugins]
    Hook -->|4. Return undefined| NextHook

    NextHook --> Final[Final Error Response]

    style Start fill:#ffcdd2
    style Success fill:#c8e6c9
    style Direct fill:#ffe0b2
    style Final fill:#ffcdd2
```
