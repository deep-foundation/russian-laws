#!/usr/bin/env node

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
import { htmlToJson } from '../htmlToJson.js';
import { processHtmlAndCreateLinks } from '../processHtmlAndCreateLinks.js';

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
    input: {
      alias: "i",
      description: "Input file path",
      type: "string",
      demandOption: true,
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

const containTypeLinkId = deep.idLocal('@deep-foundation/core', 'Contain')
console.log('containTypeLinkId', containTypeLinkId);

let html = fs.readFileSync(cliOptions.input, 'utf8');
processHtmlAndCreateLinks({deep,html});

