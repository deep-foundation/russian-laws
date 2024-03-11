[![Gitpod](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/deep-foundation/russian-laws)

# russian-law

Html preview: https://konard.github.io/russian-law

## Load latest constitution
```bash
npx --yes tsx cli/load-html.ts --name=102027595 --source-document-id=102027595
```

## Load latest criminal code
```bash
npx --yes tsx cli/load-html.ts --name="102041891" --source-document-id=102041891
```

## Convert html to json
```bash
npx --yes tsx cli/html-to-json.ts --source-file-name 605577371
```

# For developing
- [Install bun](https://bun.sh/docs/installation)
- Install dependencies (`bun install`)
- Run tests (`bun test`)
