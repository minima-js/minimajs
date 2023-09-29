# MinimaJs (A framework for backend)

- Improve the overall response time of API requests by optimizing the backend framework's performance.
- Reduce the memory footprint of the backend framework to optimize resource utilization and improve scalability.
- Enhance the developer experience by providing comprehensive documentation, tutorials, and examples for the backend framework.
- Enable support for additional integrations and plugins to extend the functionality and versatility of the backend framework.

## Demo - A hello world

everything is a module

- register module and route

## Project & Config

### ESM (es module)

- type = module

### pnp

- built with pnp(yarn berry) a modern package manager instead of node_modules

#

## App

### Modules

- app.register

### Encapsulation

- app.register()
- app.addHook()

### Middleware & Interceptor

- interceptor()

### Request

- getRequest()
- getHeader()
- getQuery()

### Response

- setHeader()
- setStatusCode()
- redirect()
- stream and iterable

### error

- HttpError
- UnauthorizedError
- abort

### Context & Local

just forget about conflict and typing

- createContext()

#

### Circular dependencies & and dynamic imports

- directly use circular deps
- import() syntax
- chunks splitting

## Auth

- createAuth
- guard
- middleware

#

## Docker & Deployment

- docker without dev dependency
- scripts/po.js

#

## Gems

### env

built with env support

- env()
- .env, .env.{name}.local

### generators & streams

- async generator functions
- readable stream
