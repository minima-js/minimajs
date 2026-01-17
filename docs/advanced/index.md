# Advanced Topics

This section covers advanced Minima.js concepts for building custom integrations and understanding the framework's internals.

## Topics

### [Custom Runtime Adapters](./custom-adapters.md)

Learn how to create custom adapters to run Minima.js on different runtimes like Deno, uWebSockets.js, or any other HTTP server implementation.

Topics covered:

- Understanding the `ServerAdapter` interface
- Converting between native and Web standard Request/Response
- Implementing runtime-specific features
- Examples for Deno, uWebSockets.js, and more

### [Container and Encapsulation](./container-encapsulation.md)

Deep dive into Minima.js's container system for managing state, settings, and module isolation.

Topics covered:

- Understanding the container architecture
- How container cloning works (arrays, cloneable objects, references)
- Using containers for plugin settings and configuration
- Module hierarchy and the modules chain
- Best practices for container usage
- Advanced patterns for shared state and encapsulation

## Who Should Read This?

These guides are for:

- **Framework integrators** creating adapters for new runtimes
- **Plugin authors** building complex plugins with state management
- **Advanced users** who need fine-grained control over encapsulation
- **Contributors** understanding Minima.js internals

## Prerequisites

Before diving into these topics, you should be familiar with:

- [Core Concepts](../core-concepts/architecture.md)
- [Hooks System](../guides/hooks.md)
- TypeScript and advanced JavaScript concepts

## Related Documentation

- [Architecture Overview](../core-concepts/architecture.md)
- [Application Lifecycle](../core-concepts/application.md)
- [Encapsulation Diagrams](../core-concepts/diagrams/encapsulation.md)
- [Plugin System](../core-concepts/plugins.md)

## Getting Help

If you're working on a custom adapter or have questions about containers:

1. Check the [source code](https://github.com/minima-js/minimajs) - the implementations are well-documented
2. Review existing adapters in `packages/server/src/node` and `packages/server/src/bun`
3. Open a [discussion](https://github.com/minima-js/minimajs/discussions) on GitHub
4. Join our community for support

## Contributing

Found an issue or want to improve these guides? Contributions are welcome! See our [Contributing Guide](https://github.com/minima-js/minimajs/blob/main/CONTRIBUTING.md).
