---
"@minimajs/schema": minor
"@minimajs/server": minor
---

Performance and API improvements:

1. Fixed web response to Node.js response conversion
2. Replaced Maps with plain objects for better performance
3. Added proper type definitions to the register function
4. Implemented adapter for IP resolution
5. Removed URL parsing in favor of custom pathname extraction
6. Improved IP, host, and protocol support by introducing proxy plugin
7. Removed unnecessary hooks and changed transform hook execution order from FIFO to LIFO