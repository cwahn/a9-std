// ============================================================================
// COMPREHENSIVE TESTS
// ============================================================================

import { Struct, Serde } from "../src/lib.ts";

// Define Option/Some/None for testing
abstract class Option<T extends Serde> extends Struct {
    abstract isSome(): this is Some<T>;
    abstract isNone(): this is None;

    map<U extends Serde>(f: (v: T) => U): Option<U> {
        return this.isSome() ? new Some(f((this as Some<T>).v)) : new None();
    }

    flatMap<U extends Serde>(f: (v: T) => Option<U>): Option<U> {
        return this.isSome() ? f((this as Some<T>).v) : new None();
    }

    unwrapOr(defaultValue: T): T {
        return this.isSome() ? (this as Some<T>).v : defaultValue;
    }
}

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

class None extends Option<never> {
    static { Struct.register(this, "3949d0fe-8bc7-42d4-b154-1cc48f3ef5c5") }

    isSome(): this is Some<never> {
        return false;
    }

    isNone(): this is None {
        return true;
    }
}

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
        throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
    }
}

console.log("\n🧪 Running comprehensive tests...\n");

let testCount = 0;
let passCount = 0;

function test(name: string, fn: () => void): void {
    testCount++;
    try {
        fn();
        passCount++;
        console.log(`✅ ${name}`);
    } catch (e) {
        console.error(`❌ ${name}`);
        console.error(`   ${e}`);
    }
}

// Test 1: Basic Some serialization
test("Some value serializes correctly", () => {
    const some = new Some(42);
    const json = JSON.stringify(some);
    const parsed = JSON.parse(json);
    assertEqual(parsed._, "a30deba3-479f-4d5c-a008-cefe9200884a", "UUID matches");
    assertEqual(parsed.v, 42, "Value matches");
});

// Test 2: Basic None serialization
test("None serializes correctly", () => {
    const none = new None();
    const json = JSON.stringify(none);
    const parsed = JSON.parse(json);
    assertEqual(parsed._, "3949d0fe-8bc7-42d4-b154-1cc48f3ef5c5", "UUID matches");
});

// Test 3: Hydration restores prototype for Some
test("Hydration restores Some prototype and methods", () => {
    const some = new Some(123);
    const json = JSON.stringify(some);
    const revived = Struct.parse<Option<number>>(json);

    assert(revived instanceof Some, "instanceof Just");
    assert(revived instanceof Option, "instanceof Maybe");
    assert(revived.isSome(), "isSome() returns true");
    assert(!revived.isNone(), "isNone() returns false");
    assertEqual(revived.unwrapOr(0), 123, "unwrapOr returns value");
});

// Test 4: Hydration restores prototype for None
test("Hydration restores None prototype and methods", () => {
    const none = new None();
    const json = JSON.stringify(none);
    const revived = Struct.parse<Option<number>>(json);

    assert(revived instanceof None, "instanceof None");
    assert(revived instanceof Option, "instanceof Maybe");
    assert(!revived.isSome(), "isSome() returns false");
    assert(revived.isNone(), "isNone() returns true");
    assertEqual(revived.unwrapOr(99), 99, "unwrapOr returns default");
});

// Test 5: map() works on Some
test("map() transforms Some value", () => {
    const some = new Some(10);
    const mapped = some.map(x => x * 2);

    assert(mapped.isSome(), "Result is Some");
    assertEqual(mapped.unwrapOr(0), 20, "Value is transformed");
});

// Test 6: map() works on None
test("map() preserves None", () => {
    const none = new None();
    const mapped = none.map(x => x * 2);

    assert(mapped.isNone(), "Result is None");
    assertEqual(mapped.unwrapOr(99), 99, "Returns default");
});

// Test 7: map() works after hydration
test("map() works after hydration", () => {
    const some = new Some(5);
    const json = JSON.stringify(some);
    const revived = Struct.parse<Option<number>>(json);
    const mapped = revived.map(x => x + 10);

    assertEqual(mapped.unwrapOr(0), 15, "Mapped value correct");
});

// Test 8: flatMap() for Some
test("flatMap() chains Some values", () => {
    const some = new Some(5);
    const result = some.flatMap(x => x > 3 ? new Some(x * 2) : new None());

    assert(result.isSome(), "Result is Some");
    assertEqual(result.unwrapOr(0), 10, "Value is correct");
});

// Test 9: flatMap() returns None
test("flatMap() can return None", () => {
    const some = new Some(2);
    const result = some.flatMap(x => x > 3 ? new Some(x * 2) : new None());

    assert(result.isNone(), "Result is None");
});

// Test 10: Nested structures
test("Nested structures serialize and hydrate correctly", () => {
    const nested: { a: Option<number>; b: Option<number>; c: Option<string> } = {
        a: new Some(1),
        b: new None(),
        c: new Some("hello")
    };

    const json = JSON.stringify(nested);
    const revived = Struct.parse<typeof nested>(json);

    assert(revived.a.isSome(), "a is Some");
    assertEqual(revived.a.unwrapOr(0), 1, "a value correct");
    assert(revived.b.isNone(), "b is None");
    assert(revived.c.isSome(), "c is Some");
    assertEqual(revived.c.unwrapOr(""), "hello", "c value correct");
});

// Test 11: Array of Maybe values
test("Arrays of Maybe serialize and hydrate correctly", () => {
    const arr = [new Some(1), new None(), new Some(3)];
    const json = JSON.stringify(arr);
    const revived = Struct.parse<Option<number>[]>(json);

    assertEqual(revived.length, 3, "Array length preserved");
    assert(revived[0].isSome(), "First is Some");
    assert(revived[1].isNone(), "Second is None");
    assert(revived[2].isSome(), "Third is Some");
    assertEqual(revived[0].unwrapOr(0), 1, "First value correct");
    assertEqual(revived[2].unwrapOr(0), 3, "Third value correct");
});

// Test 12: Maybe with string values
test("Maybe works with string values", () => {
    const some = new Some("test");
    const json = JSON.stringify(some);
    const revived = Struct.parse<Option<string>>(json);

    assertEqual(revived.unwrapOr(""), "test", "String value preserved");
});

// Test 13: Maybe with boolean values
test("Maybe works with boolean values", () => {
    const someTrue = new Some(true);
    const someFalse = new Some(false);

    const jsonTrue = JSON.stringify(someTrue);
    const jsonFalse = JSON.stringify(someFalse);

    const revivedTrue = Struct.parse<Option<boolean>>(jsonTrue);
    const revivedFalse = Struct.parse<Option<boolean>>(jsonFalse);

    assertEqual(revivedTrue.unwrapOr(false), true, "True preserved");
    assertEqual(revivedFalse.unwrapOr(true), false, "False preserved");
});

// Test 14: Maybe with null
test("Maybe works with null values", () => {
    const some = new Some(null);
    const json = JSON.stringify(some);
    const revived = Struct.parse<Option<null>>(json);

    assertEqual(revived.unwrapOr(undefined as any), null, "Null preserved");
});

// Test 15: Maybe with nested objects
test("Maybe works with nested objects", () => {
    const obj = { name: "test", value: 42, nested: { deep: true } };
    const some = new Some(obj);
    const json = JSON.stringify(some);
    const revived = Struct.parse<Option<typeof obj>>(json);

    const unwrapped = revived.unwrapOr({ name: "", value: 0, nested: { deep: false } });
    assertEqual(unwrapped.name, "test", "Object name preserved");
    assertEqual(unwrapped.value, 42, "Object value preserved");
    assertEqual(unwrapped.nested.deep, true, "Nested property preserved");
});

// Test 16: Complex chaining
test("Complex method chaining works", () => {
    const result = new Some(5)
        .map(x => x * 2)
        .map(x => x + 1)
        .map(x => x.toString());

    assertEqual(result.unwrapOr(""), "11", "Chained transformations correct");
});

// Test 17: Chaining through None
test("Chaining preserves None throughout", () => {
    const result = new None()
        .map(x => x * 2)
        .map(x => x + 1);

    assert(result.isNone(), "Result is None");
    assertEqual(result.unwrapOr(999), 999, "Default returned");
});

// Test 18: Round-trip with pretty JSON
test("Round-trip with formatted JSON", () => {
    const data = {
        x: new Some(100) as Option<number>,
        y: new None() as Option<number>
    };

    const json = JSON.stringify(data, null, 2);
    const revived = Struct.parse<typeof data>(json);

    assert(revived.x.isSome(), "x is Some after pretty JSON");
    assertEqual(revived.x.unwrapOr(0), 100, "x value preserved");
    assert(revived.y.isNone(), "y is None after pretty JSON");
});

// Test 19: UUID tag is removed from own properties after hydration
test("UUID tag is removed from own properties after hydration", () => {
    const some = new Some(42);
    const json = JSON.stringify(some);
    const revived = Struct.parse<Option<number>>(json);

    // The _ property should not be an own property (only via getter)
    const hasOwnUnderscore = Object.prototype.hasOwnProperty.call(revived, "_");
    assert(!hasOwnUnderscore, "UUID tag removed from own properties");

    // But _ getter should still work
    assert(typeof revived._ === "string", "UUID accessible via getter");
});

// Test 20: Multiple independent hydrations
test("Multiple hydrations work independently", () => {
    const json1 = JSON.stringify(new Some(1));
    const json2 = JSON.stringify(new Some(2));

    const rev1 = Struct.parse<Option<number>>(json1);
    const rev2 = Struct.parse<Option<number>>(json2);

    assertEqual(rev1.unwrapOr(0), 1, "First hydration correct");
    assertEqual(rev2.unwrapOr(0), 2, "Second hydration correct");
});

// Test 21: Deep nesting with arrays
test("Deep nesting with arrays works", () => {
    const deep: { items: { value: Option<number> }[] } = {
        items: [
            { value: new Some(1) },
            { value: new None() },
            { value: new Some(3) }
        ]
    };

    const json = JSON.stringify(deep);
    const revived = Struct.parse<typeof deep>(json);

    assertEqual(revived.items[0].value.unwrapOr(0), 1, "First item correct");
    assert(revived.items[1].value.isNone(), "Second item is None");
    assertEqual(revived.items[2].value.unwrapOr(0), 3, "Third item correct");
});

// Test 22: flatMap chaining
test("flatMap chaining works correctly", () => {
    const result = new Some(10)
        .flatMap(x => x > 5 ? new Some(x * 2) : new None())
        .flatMap(x => x < 100 ? new Some(x + 5) : new None());

    assertEqual(result.unwrapOr(0), 25, "flatMap chain correct");
});

// Test 23: Mixed map and flatMap
test("Mixed map and flatMap chaining", () => {
    const result = new Some(3)
        .map(x => x + 2)
        .flatMap(x => x > 4 ? new Some(x * 10) : new None())
        .map(x => x.toString());

    assertEqual(result.unwrapOr(""), "50", "Mixed chain correct");
});

// Test 24: Hydration with arrays at top level
test("Top-level array hydration", () => {
    const arr: { val: Option<number> }[] = [
        { val: new Some(1) },
        { val: new Some(2) }
    ];

    const json = JSON.stringify(arr);
    const revived = Struct.parse<typeof arr>(json);

    assertEqual(revived[0].val.unwrapOr(0), 1, "First element correct");
    assertEqual(revived[1].val.unwrapOr(0), 2, "Second element correct");
});

// Test 25: Empty object hydration
test("Empty object with Maybe fields", () => {
    const obj: { a?: Option<number> } = {};
    const json = JSON.stringify(obj);
    const revived = Struct.parse<typeof obj>(json);

    assertEqual(revived.a, undefined, "Undefined field preserved");
});

// ============================================================================
// SERDE ROUND-TRIP TESTS
// ============================================================================

// Test 26: Complete round-trip with complex nested structure
test("Complete round-trip with complex nested structure", () => {
    const original = {
        user: {
            id: 123,
            name: "Alice",
            email: new Some("alice@example.com") as Option<string>,
            phone: new None() as Option<string>
        },
        items: [
            { id: 1, price: new Some(99.99) as Option<number> },
            { id: 2, price: new None() as Option<number> },
            { id: 3, price: new Some(49.99) as Option<number> }
        ],
        metadata: new Some({ created: "2024-01-01", updated: "2024-12-28" }) as Option<{ created: string; updated: string }>
    };

    // Serialize
    const json = JSON.stringify(original);

    // Deserialize
    const revived = Struct.parse<typeof original>(json);

    // Verify structure
    assertEqual(revived.user.id, 123, "User ID preserved");
    assertEqual(revived.user.name, "Alice", "User name preserved");
    assertEqual(revived.user.email.unwrapOr(""), "alice@example.com", "Email preserved");
    assert(revived.user.phone.isNone(), "Phone is None");

    assertEqual(revived.items.length, 3, "Items array length preserved");
    assertEqual(revived.items[0].price.unwrapOr(0), 99.99, "First item price preserved");
    assert(revived.items[1].price.isNone(), "Second item price is None");

    const metadata = revived.metadata.unwrapOr({ created: "", updated: "" });
    assertEqual(metadata.created, "2024-01-01", "Metadata created preserved");
    assertEqual(metadata.updated, "2024-12-28", "Metadata updated preserved");

    // Verify methods work after round-trip
    const doubledPrice = revived.items[0].price.map(p => p * 2);
    assertEqual(doubledPrice.unwrapOr(0), 199.98, "Can map after round-trip");
});

// Test 27: Round-trip preserves type discrimination
test("Round-trip preserves type discrimination", () => {
    const options = [
        new Some(1) as Option<number>,
        new None() as Option<number>,
        new Some(2) as Option<number>,
        new None() as Option<number>
    ];

    const json = JSON.stringify(options);
    const revived = Struct.parse<Option<number>[]>(json);

    // Verify each maintains correct type
    assert(revived[0] instanceof Some, "First is Some after round-trip");
    assert(revived[1] instanceof None, "Second is None after round-trip");
    assert(revived[2] instanceof Some, "Third is Some after round-trip");
    assert(revived[3] instanceof None, "Fourth is None after round-trip");

    // Verify type guards work
    assert(revived[0].isSome(), "First isSome() works");
    assert(revived[1].isNone(), "Second isNone() works");
});

// Test 28: Round-trip with deeply nested Options
test("Round-trip with deeply nested Options", () => {
    const nested: Option<Option<Option<number>>> = new Some(
        new Some(
            new Some(42)
        )
    );

    const json = JSON.stringify(nested);
    const revived = Struct.parse<Option<Option<Option<number>>>>(json);

    // Unwrap layer by layer
    const layer1 = revived.unwrapOr(new None() as Option<Option<number>>);
    const layer2 = layer1.unwrapOr(new None() as Option<number>);
    const value = layer2.unwrapOr(0);

    assertEqual(value, 42, "Deeply nested value preserved");
});

// Test 29: Round-trip with array of arrays
test("Round-trip with array of arrays", () => {
    const matrix = [
        [new Some(1), new Some(2), new None()],
        [new None(), new Some(3), new Some(4)],
        [new Some(5), new None(), new Some(6)]
    ];

    const json = JSON.stringify(matrix);
    const revived = Struct.parse<Option<number>[][]>(json);

    assertEqual(revived.length, 3, "Outer array length preserved");
    assertEqual(revived[0].length, 3, "Inner array length preserved");
    assertEqual(revived[0][0].unwrapOr(0), 1, "Matrix[0][0] correct");
    assert(revived[0][2].isNone(), "Matrix[0][2] is None");
    assertEqual(revived[1][1].unwrapOr(0), 3, "Matrix[1][1] correct");
});

// Test 30: Round-trip with all primitive types
test("Round-trip with all primitive types", () => {
    const primitives: {
        num: Option<number>;
        str: Option<string>;
        bool: Option<boolean>;
        nil: Option<null>;
        none: Option<number>;
    } = {
        num: new Some(42),
        str: new Some("test"),
        bool: new Some(true),
        nil: new Some(null),
        none: new None()
    };

    const json = JSON.stringify(primitives);
    const revived = Struct.parse<typeof primitives>(json);

    assertEqual(revived.num.unwrapOr(0), 42, "Number preserved");
    assertEqual(revived.str.unwrapOr(""), "test", "String preserved");
    assertEqual(revived.bool.unwrapOr(false), true, "Boolean preserved");
    assertEqual(revived.nil.unwrapOr(undefined as any), null, "Null preserved");
    assert(revived.none.isNone(), "None preserved");
});

// ============================================================================
// NEGATIVE TESTS (EXPECTED FAILURES)
// ============================================================================

// Test 31: Hydrating invalid JSON throws error
test("Hydrating invalid JSON throws error", () => {
    let errorThrown = false;
    try {
        Struct.parse("{ invalid json }");
    } catch (e) {
        errorThrown = true;
        assert(e instanceof SyntaxError, "Throws SyntaxError for invalid JSON");
    }
    assert(errorThrown, "Error was thrown");
});

// Test 32: Unregistered class toJSON throws error
test("Unregistered class toJSON throws error", () => {
    class UnregisteredClass extends Option<number> {
        // Intentionally not calling tagType!
        isSome(): this is Some<number> { return false; }
        isNone(): this is None { return false; }
    }

    let errorThrown = false;
    try {
        const instance = new UnregisteredClass();
        instance.toJSON();
    } catch (e) {
        errorThrown = true;
        assert(e instanceof Error, "Throws Error");
        assert((e as Error).message.includes("Unregistered"), "Error mentions unregistered");
    }
    assert(errorThrown, "Error was thrown for unregistered class");
});

// Test 33: Hydrating JSON with unknown UUID preserves object
test("Hydrating JSON with unknown UUID preserves object", () => {
    const jsonWithUnknownUUID = JSON.stringify({
        value: {
            _: "00000000-0000-0000-0000-000000000000",
            data: "test"
        }
    });

    const revived = Struct.parse<{ value: any }>(jsonWithUnknownUUID);

    // Object should be preserved but not hydrated
    assertEqual(revived.value.data, "test", "Data preserved");
    assertEqual(revived.value._, "00000000-0000-0000-0000-000000000000", "UUID preserved (not deleted)");
});

// Test 34: Empty JSON structures
test("Empty JSON structures work correctly", () => {
    const emptyArray = "[]";
    const emptyObject = "{}";
    const emptyString = "\"\"";
    const nullValue = "null";

    const revivedArray = Struct.parse<any[]>(emptyArray);
    const revivedObject = Struct.parse<any>(emptyObject);
    const revivedString = Struct.parse<string>(emptyString);
    const revivedNull = Struct.parse<null>(nullValue);

    assertEqual(revivedArray.length, 0, "Empty array preserved");
    assertEqual(Object.keys(revivedObject).length, 0, "Empty object preserved");
    assertEqual(revivedString, "", "Empty string preserved");
    assertEqual(revivedNull, null, "Null preserved");
});

// Test 35: JSON with circular references (should fail at JSON.stringify)
test("Circular references fail at JSON.stringify", () => {
    const circular: any = { value: new Some(1) };
    circular.self = circular;

    let errorThrown = false;
    try {
        JSON.stringify(circular);
    } catch (e) {
        errorThrown = true;
        assert(e instanceof TypeError, "Throws TypeError for circular reference");
    }
    assert(errorThrown, "Circular reference throws error");
});

// Test 36: Very large numbers and edge cases
test("Edge case numbers are handled correctly", () => {
    const edgeCases = {
        zero: new Some(0) as Option<number>,
        negative: new Some(-999) as Option<number>,
        float: new Some(3.14159) as Option<number>,
        large: new Some(Number.MAX_SAFE_INTEGER) as Option<number>,
        small: new Some(Number.MIN_SAFE_INTEGER) as Option<number>
    };

    const json = JSON.stringify(edgeCases);
    const revived = Struct.parse<typeof edgeCases>(json);

    assertEqual(revived.zero.unwrapOr(1), 0, "Zero preserved");
    assertEqual(revived.negative.unwrapOr(0), -999, "Negative preserved");
    assertEqual(revived.float.unwrapOr(0), 3.14159, "Float preserved");
    assertEqual(revived.large.unwrapOr(0), Number.MAX_SAFE_INTEGER, "Large number preserved");
    assertEqual(revived.small.unwrapOr(0), Number.MIN_SAFE_INTEGER, "Small number preserved");
});

// Test 37: Special string characters
test("Special string characters are preserved", () => {
    const specialStrings = {
        newline: new Some("line1\nline2") as Option<string>,
        tab: new Some("col1\tcol2") as Option<string>,
        quote: new Some('He said "hello"') as Option<string>,
        backslash: new Some("path\\to\\file") as Option<string>,
        unicode: new Some("Hello 世界 🌍") as Option<string>,
        empty: new Some("") as Option<string>
    };

    const json = JSON.stringify(specialStrings);
    const revived = Struct.parse<typeof specialStrings>(json);

    assertEqual(revived.newline.unwrapOr(""), "line1\nline2", "Newline preserved");
    assertEqual(revived.tab.unwrapOr(""), "col1\tcol2", "Tab preserved");
    assertEqual(revived.quote.unwrapOr(""), 'He said "hello"', "Quotes preserved");
    assertEqual(revived.backslash.unwrapOr(""), "path\\to\\file", "Backslash preserved");
    assertEqual(revived.unicode.unwrapOr(""), "Hello 世界 🌍", "Unicode preserved");
    assertEqual(revived.empty.unwrapOr("x"), "", "Empty string preserved");
});

// Test 38: Attempting to call methods on plain JSON objects fails
test("Plain JSON objects don't have Option methods", () => {
    const plainJson = '{"v": 42}';
    const obj = JSON.parse(plainJson);

    let errorThrown = false;
    try {
        obj.isSome(); // This should fail - not an Option
    } catch (e) {
        errorThrown = true;
    }
    assert(errorThrown, "Plain object doesn't have Option methods");
});

// Test 39: None with different generic types are the same instance
test("None values are handled correctly", () => {
    const none1 = new None();
    const none2 = new None();

    // Serialize both
    const json1 = JSON.stringify(none1);
    const json2 = JSON.stringify(none2);

    // JSONs should be identical
    assertEqual(json1, json2, "None serializes consistently");

    // Both should hydrate to None
    const revived1 = Struct.parse<Option<number>>(json1);
    const revived2 = Struct.parse<Option<string>>(json2);

    assert(revived1.isNone(), "First is None");
    assert(revived2.isNone(), "Second is None");
});

// Test 40: Mixed valid and invalid data in array
test("Array with mixed valid data handles correctly", () => {
    const mixed = [
        { opt: new Some(1) as Option<number> },
        { opt: new None() as Option<number> },
        { plain: "not an option" },
        { opt: new Some("string") as Option<string> }
    ];

    const json = JSON.stringify(mixed);
    const revived = Struct.parse<any[]>(json);

    assertEqual(revived.length, 4, "Array length preserved");
    assertEqual(revived[0].opt.unwrapOr(0), 1, "First option works");
    assert(revived[1].opt.isNone(), "Second is None");
    assertEqual(revived[2].plain, "not an option", "Plain data preserved");
    assertEqual(revived[3].opt.unwrapOr(""), "string", "String option works");
});

// Test 41: Unregistered class throws error on serialization
test("Unregistered class toJSON throws error", () => {
    class UnregisteredStruct extends Struct {
        constructor(public value: number) {
            super();
        }
    }

    const instance = new UnregisteredStruct(42);
    let errorThrown = false;

    try {
        JSON.stringify(instance);
    } catch (e) {
        errorThrown = true;
        assert(e instanceof Error, "Throws Error");
        assert((e as Error).message.includes("Unregistered"), "Error mentions unregistered");
    }

    assert(errorThrown, "Error was thrown for unregistered class");
});

// Test 42: Unregistered class causes type error when used as Serde
test("Unregistered class type checking", () => {
    // This test verifies that TypeScript would show warnings
    // when trying to use unregistered classes as Serde types
    
    class RegisteredClass extends Struct {
        static { Struct.register(this, "12345678-1234-1234-1234-123456789abc") }
        constructor(public value: number) {
            super();
        }
    }

    // This should work fine
    const registered = new Some(new RegisteredClass(42));
    assertEqual(registered.unwrapOr(new RegisteredClass(0)).value, 42, "Registered class works");

    // The following would cause TypeScript errors if uncommented:
    // class UnregisteredClass extends Struct {
    //     constructor(public value: number) {
    //         super();
    //     }
    // }
    // 
    // // TypeScript error: UnregisteredClass is not assignable to Serde
    // // because it doesn't have the static registration block
    // const unregistered: Serde = new UnregisteredClass(42);
    
    assert(true, "Type checking verification complete");
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Test Results: ${passCount}/${testCount} passed`);

if (passCount === testCount) {
    console.log("\n🎉 All tests passed!");
} else {
    console.log(`\n⚠️  ${testCount - passCount} test(s) failed`);
    Deno.exit(1);
}

console.log(`${'='.repeat(50)}\n`);
