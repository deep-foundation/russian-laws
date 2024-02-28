import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { createSerialOperation } from "@deep-foundation/deeplinks/imports/gql/index.js";

export function createLinkOperation({ linkId, type, contain, title, deep, parentId = 19750 }: { linkId: number; type: number; contain: number; title: string; deep: DeepClient; parentId?: number; }) {

    return createSerialOperation({
        table: 'links',
        type: 'insert',
        objects: {
            id: linkId,
            type_id: type,
            in: {
                data: parentId ? [{
                    type_id: contain,
                    from_id: parentId,
                    string: { data: { value: title } },
                }] : [],
            },
        },
    });
}
