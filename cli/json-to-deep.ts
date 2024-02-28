#!/usr/bin/env node

import {saveFile} from '../files.js';

import fs from "fs";
import { linksToHtml } from "../links-to-html.js";
import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { generateApolloClient } from '@deep-foundation/hasura/client.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv'
dotenv.config()
import {cleanEnv, str} from 'envalid'
import { htmlToJson } from '../html-to-json.js';
import { htmlToLinks } from '../html-to-links.js';
import path from 'path'
import { jsonToLinks } from '../json-to-links.js';

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
    'source-directory': {
      alias: "s",
      description: "Source directory",
      type: "string",
      default: './data/html'
    },
    'source-file-name': {
      alias: "n",
      description: "Source file name",
      type: "string",
      demandOption: true
    },
    'source-file-extension': {
      alias: "e",
      description: "Source file extension",
      type: "string",
      default: '.html'
    },
    'target-space-id': {
      alias: "t",
      description: "Target space id",
      type: "number",
      demandOption: true
    }
  })
  .strict()
  .parseSync();

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

const containTypeLinkId = deep.idLocal('@deep-foundation/core', 'Contain')
console.log('containTypeLinkId', containTypeLinkId);

const sourceFullPath = path.join(options.sourceDirectory, options.sourceFileName);
let json = JSON.parse(fs.readFileSync(sourceFullPath, 'utf8'));
jsonToLinks({deep,json,spaceId: options.targetSpaceId});

