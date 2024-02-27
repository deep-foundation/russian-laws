import { createSerialOperation } from "@deep-foundation/deeplinks/imports/gql/index.js";

export function createClauseOperation({ clause, articleLinkId, clauseTypeLinkId, containTypeLinkId }: { clause: string; articleLinkId: number; clauseTypeLinkId: number; containTypeLinkId: number; }) {
    return createSerialOperation({
        table: 'links',
        type: 'insert',
        objects: {
            type_id: clauseTypeLinkId,
            in: {
                data: articleLinkId ? [{
                    type_id: containTypeLinkId,
                    from_id: articleLinkId,
                    string: { data: { value: clause } },
                }] : [],
            },
        },
    });
}
