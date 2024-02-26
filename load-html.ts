const axios = require('axios');
const iconv = require('iconv-lite');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path')
const { saveFile } = require('./files.js');
const { program } = require('commander');
const cheerio = require('cheerio');
const beautify = require('js-beautify').html;

program
    .option('-d, --directory <type>', 'Directory', './data/html')
    .option('-n, --name <type>', 'File name (required)')
    .option('-e, --extension <type>', 'File extension', '.html')
    .option('-s, --source-document-id <type>', 'Source Document ID (required)')
    .parse(process.argv);

const options = program.opts();
if (!options.name || !options.sourceDocumentId) {
  console.log('--name and --source-document-id are required');
  process.exit(1);
}
const fileName = options.name + options.extension
const directory = options.directory.endsWith('/') ? options.directory : options.directory + '/';  
let html = '';

const url = `http://pravo.gov.ru/proxy/ips/?doc_itself=&nd=${options.sourceDocumentId}&fulltext=1`;

function transformHtml(html) {
  html = html.replace(/^.*<div\s*id="text_content"\s*>\s*/s, '');
  html = html.replace(/\s*<\/div>\s*<\/div>\s*<\/body>\s*<\/html>\s*$/s, '');
  html = html.replaceAll('windows-1251', 'utf-8');
  html = html.replace(/<head>.*?<\/head>/s, '');

    html = html.replaceAll('?docbody', 'http://pravo.gov.ru/proxy/ips/?docbody'); // обратные ссылки на источник

  const $ = cheerio.load(html);

  $('html').attr('style', 'display: table; margin: auto;');
  $('body').attr('style', `font-size: 18px; line-height: 125%; word-wrap: break-word; display: table-cell; vertical-align: middle;`);

  html = beautify($.html(), { indent_size: 2 });

  html = html.replaceAll('font-family: "times new roman", times, serif;', 'font-family: Helvetica, sans-serif;');

  return html;
}

axios({
    url: url,
    method: 'GET',
    responseType: 'arraybuffer'
})
  .then(function (response) {
    html = iconv.decode(Buffer.from(response.data), 'win1251');
    html = transformHtml(html);
    saveFile(directory + fileName, html);
    console.log(`Document ${options.name} is loaded`);
  })
  .catch(function (error) {
    console.error(`Error on load of ${options.name} document`, error);
  });