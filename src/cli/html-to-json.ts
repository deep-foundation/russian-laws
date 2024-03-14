#!/usr/bin/env node

import { JSDOM } from "jsdom";
import { saveFile } from '../files';
import { program } from 'commander';
import path from 'path';
import fs from "fs";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { htmlToJson } from "../html-to-json";

const options = yargs(hideBin(process.argv))
  .usage(`$0 [Options]`, `Description of the program`)
  .options({
    "source-directory": {
        alias: "sd",
        description: "Source directory",
        type: "string",
        default: './data/html'
        },
    "target-directory": {
        alias: "td",
        description: "Target directory",
        type: "string",
        default: './data/json'
        },
    "source-file-name": {
        alias: "sfn",
        description: "Source file name",
        type: "string",
        demandOption: true
        },
    "target-file-name": {
        alias: "tfn",
        description: "Target file name",
        type: "string"
        },
    "source-file-extension": {
        alias: "sfe",
        description: "Source file extension",
        type: "string",
        default: '.html'
        },
    "target-file-extension": {
        alias: "tfe",
        description: "Target file extension",
        type: "string",
        default: '.json'
        }
  })
  .strict()
  .parseSync();


const sourceFileName = options.sourceFileName + options.sourceFileExtension;
const sourceDirectory = options.sourceDirectory;
const targetFileName = (options.targetFileName ? options.targetFileName : options.sourceFileName) ;
const targetFullFileName = targetFileName + options.targetFileExtension
const targetDirectory = options.targetDirectory;

let html = fs.readFileSync(path.join(sourceDirectory, sourceFileName), 'utf8');
let json = htmlToJson({html});
saveFile({content: JSON.stringify(json, null, 2),filePath: path.join(targetDirectory, targetFullFileName)});
