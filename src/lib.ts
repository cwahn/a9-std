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
 * Base class for types that can be serialized with UUID tags
 * Automatically includes UUID in JSON output via toJSON()
*/
export abstract class Struct {
    // Index signature restricts instance properties to Serde types
    // Methods are on prototype and not subject to this constraint
    [key: string]: Serde | ((...args: any[]) => any);

    /**
     * Internal registry mapping UUIDs to prototypes
     */
    static ID_TO_PROTO = new Map<UUID, object>();
    static PROTO_TO_ID = new WeakMap<object, UUID>();

    // _ getter to satisfy Struct's { _: UUID } requirement
    get _(): UUID {
        // const id = PROTO_TO_ID.get(Object.getPrototypeOf(this));
        const id = Struct.PROTO_TO_ID.get(Object.getPrototypeOf(this));
        if (!id) throw new Error("Unregistered type/prototype");
        return id;
    }

    toJSON(): Document {
        const id = Struct.PROTO_TO_ID.get(Object.getPrototypeOf(this));
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
                const id = (v as any)._ as UUID;
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
     */
    static register(Ctor: Function, id: UUID): void {
        Struct.ID_TO_PROTO.set(id, Ctor.prototype);
        Struct.PROTO_TO_ID.set(Ctor.prototype, id);
    }
}

