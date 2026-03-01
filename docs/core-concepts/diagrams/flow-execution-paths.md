```mermaid
graph TD
    Start([Incoming Request]) --> Choice{Execution Path}

    Choice -->|1️⃣ Normal Flow| N1[Route Match]
    N1 --> N2[Handler returns data]
    N2 --> N3["TRANSFORM Hook<br/><small>↑ LIFO</small>"]
    N3 --> N4[Serialize to JSON]
    N4 --> N5["SEND Hook<br/><small>↑ LIFO</small>"]
    N5 --> N6[defer callbacks]
    N6 --> N7[Send Response]

    Choice -->|2️⃣ Direct Response| D1[Route Match]
    D1 --> D2[Handler returns Response]
    D2 --> D5["SEND Hook<br/><small>↑ LIFO</small>"] --> N6

    Choice -->|3️⃣ Early Return| E1["REQUEST Hook<br/><small>↓ FIFO</small>"]
    E1 --> E2[Returns Response]
    E2 --> E5["SEND Hook<br/><small>↑ LIFO</small>"] --> N6

    Choice -.->|4️⃣ Error at Any Stage| R1["ERROR Hook<br/><small>↑ LIFO</small>"]
    R1 --> R2[Serialize Error]
    R2 --> R3["SEND Hook<br/><small>↑ LIFO</small>"]
    R3 --> R4[onError callbacks] --> N6

    class Start,Choice neutral
    class N1,N2,N3,N4,N5,N6,N7 success
    class D1,D2,D5 warn
    class E1,E2,E5 info
    class R1,R2,R3,R4 danger

```
