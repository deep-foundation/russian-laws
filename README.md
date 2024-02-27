[![Gitpod](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/deep-foundation/russian-laws)

# russian-law

Html preview: https://konard.github.io/russian-law

## Load latest constitution
```bash
node load-html.js --name=102027595 --source-document-id=102027595
```

## Load latest criminal code
```bash
node load-html.js --name="102041891" --source-document-id=102041891
```

## Convert html to json
```bash
node html-to-json.js --source-file-name 605577371
```