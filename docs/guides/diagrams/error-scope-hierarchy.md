```mermaid
graph TB
    Root["Root App<br/>(Global Error Handler)"]
    Root --> Module1["Admin Module<br/>(Admin Error Handler)"]
    Root --> Module2["API Module<br/>(API Error Handler)"]

    Module1 --> Route1["/admin/dashboard"]
    Module1 --> Route2["/admin/users"]
    Module2 --> Route3["/api/posts"]

    Route1 -.->|Error occurs| Exec1["1. Admin Handler<br/>2. Global Handler<br/>3. app.errorHandler"]
    Route3 -.->|Error occurs| Exec2["1. API Handler<br/>2. Global Handler<br/>3. app.errorHandler"]

    style Root fill:#e1f5fe
    style Module1 fill:#b3e5fc
    style Module2 fill:#b3e5fc
    style Exec1 fill:#fff3e0
    style Exec2 fill:#fff3e0
```
