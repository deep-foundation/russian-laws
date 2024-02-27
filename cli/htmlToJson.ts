import {saveFile} from '../files.js';

import fs from "fs";
import { rebuildHtmlFromDeepLinks } from "../rebuildHtmlFromDeepLinks.js";
import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { generateApolloClient } from '@deep-foundation/hasura/client.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv'
dotenv.config()
import {cleanEnv, str} from 'envalid'

const env = cleanEnv(process.env, {
  DEEP_TOKEN: str(),
})

const cliOptions = yargs(hideBin(process.argv))
  .usage(`$0 [Options]`, `Description of the program`)
  .options({
    "graphql-path": {
      alias: "gql-p",
      description: "Path to GraphQL endpoint",
      type: "string",
      demandOption: true,
    },
    ssl: {
      alias: "s",
      description: "Should use SSL",
      type: "boolean",
    },
  })
  .strict()
  .parseSync();

const apolloClient = generateApolloClient({
    path: cliOptions.graphqlPath,
    ssl: cliOptions.ssl,
  });
  const unloginedDeep = new DeepClient({ apolloClient });
  const guestLoginResult = await unloginedDeep.guest();
  const guestDeep = new DeepClient({ deep: unloginedDeep, ...guestLoginResult });
  const adminLoginResult = await guestDeep.login({
    token: env.DEEP_TOKEN,
  });
  const deep = new DeepClient({ deep: guestDeep, ...adminLoginResult });

export const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain')
console.log('containTypeLinkId', containTypeLinkId);
//
// let html = fs.readFileSync('./data/html/102110364.html', 'utf8');
// let result = htmlToJson(html);
// saveFile('./data/json/102110364.json', JSON.stringify(result, null, 2));
// processHtmlAndCreateLinks(html);
deep.select({
    up: {
        parent_id: 20203,
    }
}).then((result) => {
    deep.minilinks.apply(result.data);
    const html = rebuildHtmlFromDeepLinks({ deep, rootId: 20203 });

    saveFile({ filePath: 'rebuilt.html', content: html });

});
