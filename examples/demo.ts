// ============================================================================
// USAGE DEMO
// ============================================================================

import { Struct, Serde } from "../src/lib.ts";

// ============================================================================
// EXAMPLE: Option<T> ADT Implementation
// ============================================================================

/**
 * Option<T> represents an optional value: either Some<T> or None
 */
abstract class Option<T extends Serde> extends Struct {
    abstract isSome(): this is Some<T>;
    abstract isNone(): this is None;

    /**
     * Transform the value if Some, otherwise return None
     */
    map<U extends Serde>(f: (v: T) => U): Option<U> {
        return this.isSome() ? new Some(f((this as Some<T>).v)) : new None();
    }

    /**
     * Transform the value and flatten the result
     */
    flatMap<U extends Serde>(f: (v: T) => Option<U>): Option<U> {
        return this.isSome() ? f((this as Some<T>).v) : new None();
    }

    /**
     * Return the value if Some, otherwise return the default value
     */
    unwrapOr(defaultValue: T): T {
        return this.isSome() ? (this as Some<T>).v : defaultValue;
    }
}

/**
 * Some variant of Option, containing a value
 */
class Some<T extends Serde> extends Option<T> {
    static { Struct.register(this, "a30deba3-479f-4d5c-a008-cefe9200884a") }

    constructor(public readonly v: T) {
        super();
    }

    isSome(): this is Some<T> {
        return true;
    }

    isNone(): this is None {
        return false;
    }
}

/**
 * None variant of Option, representing absence of a value
 */
class None extends Option<never> {
    static { Struct.register(this, "3949d0fe-8bc7-42d4-b154-1cc48f3ef5c5") }

    isSome(): this is Some<never> {
        return false;
    }

    isNone(): this is None {
        return true;
    }
}

// ============================================================================
// DEMO EXAMPLES
// ============================================================================

console.log("📝 Usage Demo\n");
console.log("=".repeat(50));

// Example 1: Basic usage
console.log("\n1. Basic Maybe usage:");
const some: Option<number> = new Some(42);
const none: Option<number> = new None();

console.log("  Some(42).unwrapOr(0) =", some.unwrapOr(0));
console.log("  None.unwrapOr(0) =", none.unwrapOr(0));

// Example 2: Mapping
console.log("\n2. Mapping transformations:");
const mapped = new Some(10).map(x => x * 2).map(x => x + 1);
console.log("  Some(10).map(x2).map(+1) =", mapped.unwrapOr(0));


// Example 3: Serialization
console.log("\n3. Serialization:");
const data = {
    name: "example",
    value: new Some(123) as Option<number>,
    optional: new None() as Option<number>
};

const json = JSON.stringify(data, null, 2);
console.log("  Serialized:\n", json);

// Example 4: Deserialization
console.log("\n4. Deserialization:");
const revived = Struct.parse<typeof data>(json);
console.log("  revived.value.unwrapOr(0) =", revived.value.unwrapOr(0));
console.log("  revived.value instanceof Just =", revived.value instanceof Some);
console.log("  revived.optional.isNone() =", revived.optional.isNone());

// Example 5: Method chaining after hydration
console.log("\n5. Chaining after hydration:");
const chainResult: Option<string> = revived.value
    .map(x => x + 1)
    .map(x => `Result: ${x}`);
console.log("  Chained result:", chainResult.unwrapOr("N/A"));

// Example 6: flatMap
console.log("\n6. FlatMap example:");
const divide = (a: number, b: number): Option<number> =>
    b === 0 ? new None() : new Some(a / b);

const result1 = new Some(10).flatMap(x => divide(x, 2));
const result2 = new Some(10).flatMap(x => divide(x, 0));

console.log("  10 / 2 =", result1.unwrapOr(-1));
console.log("  10 / 0 =", result2.unwrapOr(-1));

console.log("\n" + "=".repeat(50) + "\n");


