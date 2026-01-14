```mermaid
graph TD
    Start([Incoming HTTP Request])
    Start --> CreateCtx["Create Context<br/><small>params · body · headers</small>"]

    CreateCtx --> ReqHook{"hook:request<br/><small>↓ FIFO</small>"}

    ReqHook -->|Returns Response<br/><small>short-circuit</small>| SendHook
    ReqHook -->|Continue| RouteMatch["Route Matching"]

    RouteMatch --> Handler["Route Handler<br/>Execution"]

    Handler -->|Returns data| Transform["hook:transform<br/><small>↑ LIFO</small>"]
    Handler -->|Returns Response| SendHook

    Transform --> Serialize["Serialize body<br/><small>JSON · text · stream</small>"]

    Serialize --> SendHook["hook:send<br/><small>↑ LIFO</small>"]

    SendHook --> Defer["defer()<br/><small>post-response tasks</small>"]
    Defer --> Complete([Request Complete])

    %% Error Flow
    ReqHook -.->|throws| ErrorHook
    RouteMatch -.->|throws| ErrorHook
    Handler -.->|throws| ErrorHook
    Transform -.->|throws| ErrorHook

    ErrorHook["hook:error<br/><small>↑ LIFO</small>"]
        --> SerializeErr["Serialize error"]
        --> ErrorSendHook["hook:send<br/><small>↑ LIFO</small>"]
        --> OnError["onError()<br/><small>request cleanup</small>"]
        --> Defer

    %% Styling
    style CreateCtx fill:#e1f5ff
    style ReqHook fill:#fff4e1
    style RouteMatch fill:#e7f9e7
    style Handler fill:#f0e7ff
    style Transform fill:#ffe7f0
    style Serialize fill:#ffe7f0
    style SendHook fill:#e7f9e7
    style Defer fill:#f0f0f0

    style ErrorHook fill:#ffe1e1
    style SerializeErr fill:#ffe1e1
    style ErrorSendHook fill:#e7f9e7
    style OnError fill:#ffe1e1
```
