```mermaid
graph TB
    Start[Request] --> Handler[Route Handler]
    Handler -->|Success| Response[Normal Response]
    Handler -->|Error| ErrorCheck{Error Hooks<br/>Registered?}

    ErrorCheck -->|Yes| HookChain[Run Error Hooks<br/>LIFO order]
    ErrorCheck -->|No| FallbackHandler[app.errorHandler]

    HookChain -->|Handled| CreateResp[Create Error Response]
    HookChain -->|Unhandled| FallbackHandler

    FallbackHandler --> CreateResp
    CreateResp --> SendHook[send Hook]
    SendHook --> End[Send Response]

    Response --> SendHook

    class Start info
    class Handler,HookChain accent
    class Response,End success
    class ErrorCheck warn
    class FallbackHandler,CreateResp danger
    class SendHook neutral

```
