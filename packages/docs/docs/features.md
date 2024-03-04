---
slug: /features
sidebar_position: 3
---

## Demo - A hello world

- register module and route

## Project & Config

### ESM (es module)

- type = module

### pnp

- built with pnp(yarn berry) a modern package manager instead of node_modules

#

## Server

- signals
- defer

### Modules

- app.register

### Encapsulation

- app.register()

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

## Schema

- createBody
- createHeader
- custom validation

## Docker & Deployment

- docker without dev dependency
- scripts/po.js

#

## Gems

### generators & streams

- async generator functions
- readable stream
