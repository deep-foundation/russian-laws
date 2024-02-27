import { generateApolloClient } from "@deep-foundation/hasura/client.js";
import { DeepClient, parseJwt } from "@deep-foundation/deeplinks/imports/client.js";

// Преобразование HTML к JSON
export const makeDeepClient = ({ token }: { token: string; }) => {
    let GQL_URN = "3006-deepfoundation-dev-a1imnyn6psf.ws-eu107.gitpod.io/gql";
    let GQL_SSL = "1";
    if (!token) throw new Error('No token provided');
    const decoded = parseJwt(token);
    const linkId = decoded?.userId;
    const apolloClient = generateApolloClient({
        path: GQL_URN,
        ssl: !!+GQL_SSL,
        token,
    });


    const deepClient = new DeepClient({ apolloClient, linkId, token });
    return deepClient;
};
