# The Application

The core of a Minima.js application is the application instance, which is created using the `createApp` function from the `@minimajs/server` package. The application instance is an object that represents your web application and provides the methods for defining routes, registering plugins, and starting the server.

## Creating an Application

To create a new Minima.js application, you first need to import the `createApp` function and call it:

```typescript
import { createApp } from '@minimajs/server';

const app = createApp();
```

The `createApp` function returns an application instance, which is typically stored in a variable named `app`.

## Application Options

The `createApp` function accepts an optional `options` object that allows you to customize the behavior of your application. These options are passed directly to the underlying Fastify server.

For example, you can set a custom logger for your application:

```typescript
import { createApp } from '@minimajs/server';

const app = createApp({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});
```

For a full list of available options, please refer to the [Fastify documentation](https://www.fastify.io/docs/latest/Reference/Server/).

## Starting the Server

Once you have created your application and defined your routes, you can start the server by calling the `listen` method:

```typescript
await app.listen({ port: 3000 });
```

The `listen` method starts the server and makes it listen for incoming requests on the specified port.

## Application Methods

The application instance provides a set of methods for defining routes, registering plugins, and managing your application. Here are some of the most commonly used methods:

*   **`app.get(path, handler)`**: Defines a route that responds to GET requests.
*   **`app.post(path, handler)`**: Defines a route that responds to POST requests.
*   **`app.put(path, handler)`**: Defines a route that responds to PUT requests.
*   **`app.delete(path, handler)`**: Defines a route that responds to DELETE requests.
*   **`app.route(options)`**: A generic method for defining routes with more advanced options.
*   **`app.register(plugin)`**: Registers a plugin, which can be a module or a third-party plugin.
*   **`app.listen(options)`**: Starts the server.
*   **`app.close()`**: Stops the server.

In the next sections, we will explore these methods in more detail.