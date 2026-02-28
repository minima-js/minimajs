```mermaid
graph LR
    A[Handler] --> B[Transform] --> C[Serialize]
    C --> D[Send Hook 3]
    D -->|Response| Exit1[Early Exit]
    D -->|void| E[Send Hook 2]
    E -->|Response| Exit2[Early Exit]
    E -->|void| F[Send Hook 1]
    F -->|Response| Exit3[Early Exit]
    F -->|void| G[Create Response]

    Exit1 & Exit2 & Exit3 & G --> H[Send to Client]

    class A,B,D,E,F accent
    class C warn
    class G neutral
    class H success
    class Exit1,Exit2,Exit3 danger

```
