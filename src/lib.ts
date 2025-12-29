// ============================================================================
// CORE LIBRARY: Serializable Tagged Types with Prototype Hydration
// ============================================================================
// Minimal library for JSON serialization/deserialization that preserves
// prototypes and methods using UUID-tagged discriminated unions.

/**
 * UUID type with basic format validation via template literal
 */
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export type Document = { _: UUID } & { [key: string]: Field };
export type Field = null | boolean | number | string | Document | Field[] | { [key: string]: Field };

export type Serde = null | boolean | number | string | Struct | Serde[] | { [key: string]: Serde };

/**
 * Field type definitions for schema registration
 */
export type FieldType =
    | "null" | "boolean" | "number" | "string" | UUID | "array" | "object"

export type Schema = Record<string, FieldType>;

/**
 * Base class for types that can be serialized with UUID tags
 * Automatically includes UUID in JSON output via toJSON()
*/
export abstract class Struct {
    // Index signature restricts instance properties to Serde types
    // Methods are on prototype and not subject to this constraint
    [key: string]: Serde | ((...args: any[]) => any) | undefined;

    /**
     * Internal registry mapping UUIDs to prototypes
     */
    static ID_TO_PROTO = new Map<UUID, object>();
    static PROTO_TO_ID = new WeakMap<object, UUID>();

    /** Returns the UUID associated with the prototype of this instance */
    // get _(): UUID {
    //     const proto = Object.getPrototypeOf(this);
    //     return (proto as any)._ || (() => { throw new Error("Unregistered type/prototype"); })();
    // }

    static _: UUID;

    toJSON(): Document {
        const proto = Object.getPrototypeOf(this);
        const id = (proto as any)._;
        if (!id) throw new Error("Unregistered type/prototype");

        const result: Document = { _: id };
        // Copy own enumerable properties
        for (const key of Object.keys(this)) {
            result[key] = (this as any)[key];
        }
        return result;
    }

    /**
     * Deserialize JSON string and restore prototypes for tagged objects
     * @param json - JSON string containing serialized tagged objects
     * @returns Hydrated object with restored prototypes and methods
     */
    static parse<T extends Serde>(json: string): T {
        return JSON.parse(json, (_k, v) => {
            if (v && typeof v === "object" && !Array.isArray(v) && typeof (v as any)._ === "string") {
                const id = (v as any)._;
                const proto = Struct.ID_TO_PROTO.get(id);
                if (proto) {
                    Object.setPrototypeOf(v, proto);
                    delete (v as any)._;
                }
            }
            return v;
        }) as T;
    }

    /**
     * Register a class constructor with a UUID for serialization
     * @param Ctor - Constructor function to register
     * @param id - UUID identifier for this type
     * @param schema - Optional field type definitions to store in prototype
     * 
     * @example
     * ```ts
     * Struct.register(MyClass, "uuid-here", {
     *   name: "string",
     *   age: "number",
     *   items: { array: "string" },
     *   nested: { struct: "other-uuid" }
     * });
     * ```
     */
    static register<T extends Struct>(
        Ctor: new (...args: any[]) => T,
        id: UUID,
        schema?: Schema
    ): void {
        Struct.ID_TO_PROTO.set(id, Ctor.prototype);
        Struct.PROTO_TO_ID.set(Ctor.prototype, id);
        // Set UUID directly on prototype (accessed via getter)
        (Ctor.prototype as any)._ = id;
        // Store field schema if provided
        if (schema) {
            (Ctor.prototype as any).__schema__ = schema;
        }
    }
}

