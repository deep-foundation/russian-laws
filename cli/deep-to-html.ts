#!/usr/bin/env node

import {saveFile} from '../files.js';
import path from 'path'
import { linksToHtml } from "../links-to-html.js";
import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { generateApolloClient } from '@deep-foundation/hasura/client.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv'
dotenv.config()
import {cleanEnv, str} from 'envalid'

main();

async function main() {
  const env = cleanEnv(process.env, {
    DEEP_TOKEN: str(),
  })
  
  const options = yargs(hideBin(process.argv))
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
      'source-document-root-id': {
        alias: "s",
        description: "Source Document Root ID",
        type: "number",
        demandOption: true
      },
      'target-directory': {
        alias: "t",
        description: "Target directory",
        type: "string",
        default: './data/html'
      },
      'target-file-name': {
        alias: "n",
        description: "Target file name",
        type: "string",
        demandOption: true
      },
      'target-file-extension': {
        alias: "e",
        description: "Target file extension",
        type: "string",
        default: '.html'
      }
    })
    .strict()
    .parseSync();
  
    const targetFileName = options.targetFileName + options.targetFileExtension;
  
  const apolloClient = generateApolloClient({
      path: options.graphqlPath,
      ssl: options.ssl,
    });
    const unloginedDeep = new DeepClient({ apolloClient });
    const guestLoginResult = await unloginedDeep.guest();
    const guestDeep = new DeepClient({ deep: unloginedDeep, ...guestLoginResult });
    const adminLoginResult = await guestDeep.login({
      token: env.DEEP_TOKEN,
    });
    const deep = new DeepClient({ deep: guestDeep, ...adminLoginResult });
  
  deep.select({
      up: {
          parent_id: 20203,
      }
  }).then(async (result) => {
      deep.minilinks.apply(result.data);
      const html = await linksToHtml({ deep, documentRootId: 20203 });
      saveFile({ filePath: path.join(options.targetDirectory, targetFileName), content: html });
  });
  
}