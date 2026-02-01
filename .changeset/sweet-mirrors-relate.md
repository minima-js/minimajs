---
"@minimajs/server": minor
---

Middleware Support and Configurable Execution Context

This release adds comprehensive middleware support and makes the execution context system configurable:

**New Features:**

- Middleware support for request/response pipeline customization
- Exposed `executionContext` for advanced async context management
- Exposed `contextProvider` making context handling fully configurable
- Enhanced request lifecycle control

**Use Cases:**

- Logging and monitoring middleware
- Error handling middleware
- Custom context injection

These changes enable more flexible application architecture while maintaining backward compatibility.
