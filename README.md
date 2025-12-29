# a9-std

[![npm version](https://badge.fury.io/js/a9-std.svg)](https://www.npmjs.com/package/a9-std)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Minimal TypeScript library for JSON serialization that preserves prototypes and methods using UUID-tagged discriminated unions.

## Features

- ✨ **Preserve Methods**: Serialize and deserialize objects while maintaining their prototype methods
- 🎯 **Type-Safe**: Full TypeScript support with generic constraints
- 🔖 **UUID-Tagged**: Automatic discriminated union handling via UUID tags
- 📦 **Zero Dependencies**: Pure TypeScript implementation
- 🚀 **Deno & Node**: Works with both Deno and Node.js
- 🎨 **Clean API**: Simple `Struct` base class and static `parse()` method

## Installation

### npm/yarn/pnpm

```bash
npm install a9-std
# or
yarn add a9-std
# or
pnpm add a9-std
```

### Deno

```typescript
import { Struct, tagType } from "https://deno.land/x/a9_std@v0.1.0/src/lib.ts";
```

Or import from npm with Deno:

```typescript
import { Struct, tagType } from "npm:a9-std@0.1.0";
```

## Quick Start

### 1. Define Your Tagged Types

```typescript
import { Struct, tagType, Serde } from "a9-std";

// Define an Option<T> (Maybe) type
abstract class Option<T extends Serde> extends Struct {
  abstract isSome(): this is Some<T>;
  abstract isNone(): this is None;
  
  map<U extends Serde>(f: (v: T) => U): Option<U> {
    return this.isSome() ? new Some(f(this.v)) : new None();
  }
  
  unwrapOr(defaultValue: T): T {
    return this.isSome() ? this.v : defaultValue;
  }
}

class Some<T extends Serde> extends Option<T> {
  static { tagType(this, "a30deba3-479f-4d5c-a008-cefe9200884a") }
  
  constructor(public readonly v: T) {
    super();
  }
  
  isSome(): this is Some<T> { return true; }
  isNone(): this is None { return false; }
}

class None extends Option<never> {
  static { tagType(this, "3949d0fe-8bc7-42d4-b154-1cc48f3ef5c5") }
  
  isSome(): this is Some<never> { return false; }
  isNone(): this is None { return true; }
}
```

### 2. Serialize & Deserialize

```typescript
// Create instances
const data = {
  name: "example",
  value: new Some(42),
  optional: new None()
};

// Serialize to JSON
const json = JSON.stringify(data);
console.log(json);
// {"name":"example","value":{"_":"a30deba3...","v":42},"optional":{"_":"3949d0fe..."}}

// Deserialize with prototype restoration
const revived = Struct.parse<typeof data>(json);

// Methods are preserved!
console.log(revived.value.unwrapOr(0)); // 42
console.log(revived.value.isSome());     // true
console.log(revived.optional.isNone());  // true

// Method chaining works
const result = revived.value
  .map(x => x * 2)
  .map(x => x + 1);
console.log(result.unwrapOr(0)); // 85
```

## API Reference

### Core Types

#### `UUID`
```typescript
type UUID = `${string}-${string}-${string}-${string}-${string}`;
```
Template literal type for UUID validation.

#### `Serde`
```typescript
type Serde = null | boolean | number | string | Struct | Serde[] | { [key: string]: Serde };
```
Union of all serializable value types.

#### `Document`
```typescript
type Document = { _: UUID } & { [key: string]: Field };
```
Internal representation with UUID discriminator.

### Classes

#### `Struct`

Base class for serializable tagged types.

**Methods:**
- `toJSON(): Document` - Automatically called by `JSON.stringify()`
- `static parse<T>(json: string): T` - Deserialize JSON with prototype restoration
- `get _(): UUID` - Get the UUID tag for this instance

**Usage:**
```typescript
class MyType extends Struct {
  static { tagType(this, "your-uuid-here") }
  
  constructor(public value: number) {
    super();
  }
  
  double(): number {
    return this.value * 2;
  }
}
```

#### `tagType(Ctor, id)`

Register a class constructor with a UUID.

**Parameters:**
- `Ctor: Function` - Constructor function to register
- `id: UUID` - UUID identifier for this type

**Usage:**
```typescript
class MyClass extends Struct {
  static {
    tagType(this, "12345678-1234-1234-1234-123456789abc");
  }
}
```

## Advanced Examples

### Nested Structures

```typescript
const nested = {
  user: {
    name: "Alice",
    age: new Some(30)
  },
  tags: [new Some("typescript"), new None(), new Some("deno")]
};

const json = JSON.stringify(nested);
const revived = Struct.parse<typeof nested>(json);

// All methods preserved at any depth
revived.user.age.map(x => x + 1); // Some(31)
revived.tags[0].unwrapOr("default"); // "typescript"
```

### Deeply Nested Generics

```typescript
const deeplyNested: Option<Option<Option<number>>> = new Some(
  new Some(
    new Some(42)
  )
);

const json = JSON.stringify(deeplyNested);
const revived = Struct.parse<Option<Option<Option<number>>>>(json);

// Unwrap layer by layer
const layer1 = revived.unwrapOr(new None());
const layer2 = layer1.unwrapOr(new None());
const value = layer2.unwrapOr(0); // 42
```

## How It Works

1. **Registration**: Static blocks register each class with a UUID using `tagType()`
2. **Serialization**: `toJSON()` adds the UUID as `_` property and copies enumerable properties
3. **Deserialization**: `Struct.parse()` uses `JSON.parse()` with a reviver function that:
   - Detects objects with `_` UUID property
   - Looks up the registered prototype
   - Restores the prototype with `Object.setPrototypeOf()`
   - Removes the `_` property (accessible via getter)

## TypeScript Configuration

For best results, use these TypeScript compiler options:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist"
  }
}
```

## Testing

```bash
# Run tests with Deno
deno run test/test.ts

# Run demo
deno run examples/demo.ts
```

## License

MIT © Chanwoo Ahn

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Repository

**GitHub:** https://github.com/cwahn/a9-std  
**npm:** https://www.npmjs.com/package/a9-std
