---
"@minimajs/server": minor
---

### Added

- Automatic module discovery for files named `module.{js,ts}`
- Controllers API via `controller(import('./controller'), ['GET / getList'])`

### Changed

- Enabled body parser and route logger by default
- Renamed `RouteHandler` to `Handler`
