```mermaid
graph TB
    Start[Request Arrives] --> Hook3["Hook 3 (registered last)<br/>▶ Runs FIRST"]
    Hook3 --> Hook2["Hook 2 (registered second)<br/>▶ Runs SECOND"]
    Hook2 --> Hook1["Hook 1 (registered first)<br/>▶ Runs LAST"]
    Hook1 --> Handler[Route Handler]

    style Hook3 fill:#51cf66
    style Hook2 fill:#74c0fc
    style Hook1 fill:#ffd43b
```
