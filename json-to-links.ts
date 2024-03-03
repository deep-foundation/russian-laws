import type {
  DeepClient,
  SerialOperation,
} from "@deep-foundation/deeplinks/imports/client.js";
import { createClauseOperation } from "./create-clause-operation.js";
import { htmlToJson } from "./html-to-json.js";
import { Comment } from "./comment.js";
import type { LawPage } from "./law-page.js";
import { log } from "./log.js";
import { createSerialOperation } from "@deep-foundation/deeplinks/imports/gql/serial.js";
import { Chapter } from "./chapter.js";
import { Article } from "./article.js";
import { Section } from "./section.js";
import { Clause } from "./clause.js";

export async function jsonToLinks({
  deep,
  json,
  spaceId,
}: {
  deep: DeepClient;
  json: LawPage;
  spaceId: number;
}) {
  const containTypeLinkId = await deep.id("@deep-foundation/core", "Contain");
  const commentTypeLinkId = await deep.id("@deep-foundation/law", "Comment");
  const articleTypeLinkId = await deep.id("@deep-foundation/law", "Article");
  const sectionTypeLinkId = await deep.id("@deep-foundation/law", "Section");
  const chapterTypeLinkId = await deep.id("@deep-foundation/law", "Chapter");
  const clauseTypeLinkId = await deep.id("@deep-foundation/law", "Clause");
  const indexTypeLinkId = await deep.id("@deep-foundation/law", "Index");

  log("containTypeLinkId", containTypeLinkId);
  log("commentTypeLinkId", commentTypeLinkId);
  log("articleTypeLinkId", articleTypeLinkId);
  log("sectionTypeLinkId", sectionTypeLinkId);
  log("chapterTypeLinkId", chapterTypeLinkId);
  log("clauseTypeLinkId", clauseTypeLinkId);

  let count = 0;
  json.sections.forEach((section) => {
    count++; // section
    count++; // index for section
    section.children.forEach((chapterOrComment) => {
      count++; // item
      count++; // index for item
      const hasChildren = "children" in chapterOrComment;
      if (hasChildren) {
        const chapter = chapterOrComment;
        chapter.children.forEach((articleOrComment) => {
          count++; // article
          count++; // index for article
          const hasChildren = "children" in articleOrComment;
          if (hasChildren) {
            const article = articleOrComment;
            article.children.forEach((commentOrClause) => {
              count++; // clause
              count++; // index for clause
            });
          }
        });
      }
    });
  });

  const reservedIds = await deep.reserve(count);
  log({ reservedIds });

  let operations: Array<SerialOperation> = [];
  const processComments = ({
    comments,
    parentLinkId,
  }: {
    comments: Array<Comment>;
    parentLinkId: number;
  }) => {
    comments?.forEach((comment) => {
      operations.push({
        table: "links",
        type: "insert",
        objects: {
          type_id: commentTypeLinkId,
          in: {
            data: parentLinkId
              ? [
                  {
                    type_id: containTypeLinkId,
                    from_id: parentLinkId,
                    string: { data: { value: comment.text } },
                  },
                ]
              : [],
          },
        },
      });
    });
  };

  const processClause = ({
    clause,
    articleLinkId,
    clauseIndex,
  }: {
    clause: Clause;
    articleLinkId: number;
    clauseIndex: number;
  }) => {
    const clauseLinkId = reservedIds.pop();
    const indexForClauseLinkId = reservedIds.pop();
    log({ clauseLinkId, indexForClauseLinkId });
    if (!clauseLinkId || !indexForClauseLinkId) {
      throw new Error("No reserved id");
    }
    const clauseInsertOpertaion = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: clauseLinkId,
        type_id: clauseTypeLinkId,
        in: {
          data: [
            {
              type_id: containTypeLinkId,
              from_id: articleLinkId,
              string: { data: { value: clause.text } },
            },
          ],
        },
      },
    });
    const clauseIndexInsertOperation = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: indexForClauseLinkId,
        type_id: indexTypeLinkId,
        in: {
          data: {
            type_id: containTypeLinkId,
            from_id: articleLinkId,
            number: { data: { value: clauseIndex } },
          },
        },
      },
    });
    operations.push(clauseInsertOpertaion, clauseIndexInsertOperation);
  };

  const processArticle = ({
    article,
    chapterLinkId,
    articleIndex,
  }: {
    article: Article;
    chapterLinkId: number;
    articleIndex: number;
  }) => {
    const articleLinkId = reservedIds.pop();
    const indexForArticleLinkId = reservedIds.pop();
    log({ articleLinkId, indexForArticleLinkId });
    if (!articleLinkId || !indexForArticleLinkId) {
      throw new Error("No reserved id");
    }

    const articleInsertOpertaion = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: articleLinkId,
        type_id: chapterTypeLinkId,
        in: {
          data: [
            {
              type_id: containTypeLinkId,
              from_id: chapterLinkId,
              string: { data: { value: article.title } },
            },
          ],
        },
      },
    });
    const articleIndexInsertOperation = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: indexForArticleLinkId,
        type_id: indexTypeLinkId,
        in: {
          data: {
            type_id: containTypeLinkId,
            from_id: chapterLinkId,
            number: { data: { value: articleIndex } },
          },
        },
      },
    });
    operations.push(articleInsertOpertaion, articleIndexInsertOperation);

    processComments({
      comments: article.comments,
      parentLinkId: articleLinkId,
    });

    article.clauses.forEach((clause, clauseIndex) => {
      processClause({ articleLinkId, clause, clauseIndex });
    });
  };

  const processChapter = ({
    chapter,
    sectionLinkId,
    chapterIndex,
  }: {
    chapter: Chapter;
    sectionLinkId: number;
    chapterIndex: number;
  }) => {
    const chapterLinkId = reservedIds.pop();
    const indexForChapterLinkId = reservedIds.pop();
    log({ chapterLinkId, indexForChapterLinkId });
    if (!chapterLinkId || !indexForChapterLinkId) {
      throw new Error("No reserved id");
    }

    const chapterInsertOpertaion = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: chapterLinkId,
        type_id: chapterTypeLinkId,
        in: {
          data: [
            {
              type_id: containTypeLinkId,
              from_id: sectionLinkId,
              string: { data: { value: chapter.title } },
            },
          ],
        },
      },
    });
    const chapterIndexInsertOperation = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: indexForChapterLinkId,
        type_id: indexTypeLinkId,
        in: {
          data: {
            type_id: containTypeLinkId,
            from_id: sectionLinkId,
            number: { data: { value: chapterIndex } },
          },
        },
      },
    });
    operations.push(chapterInsertOpertaion, chapterIndexInsertOperation);
    const comments = chapter.comments;
    processComments({ comments, parentLinkId: chapterLinkId });

    const articles = chapter.articles;

    articles.forEach((article, articleIndex) => {
      processArticle({ article, articleIndex, chapterLinkId });
    });
  };

  const processSection = ({
    section,
    sectionIndex,
  }: {
    section: Section;
    sectionIndex: number;
  }) => {
    const sectionLinkId = reservedIds.pop();
    const indexForSectionLinkId = reservedIds.pop();
    log({ sectionLinkId, indexForSectionLinkId });
    if (!sectionLinkId || !indexForSectionLinkId) {
      throw new Error("No reserved id");
    }
    const sectionInsertOpertaion = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: sectionLinkId,
        type_id: sectionTypeLinkId,
        in: {
          data: spaceId
            ? [
                {
                  type_id: containTypeLinkId,
                  from_id: spaceId,
                  string: { data: { value: section.title } },
                },
              ]
            : [],
        },
      },
    });
    const sectionIndexInsertOperation = createSerialOperation({
      table: "links",
      type: "insert",
      objects: {
        id: indexForSectionLinkId,
        type_id: indexTypeLinkId,
        in: {
          data: spaceId
            ? [
                {
                  type_id: containTypeLinkId,
                  from_id: spaceId,
                  number: { data: { value: sectionIndex } },
                },
              ]
            : [],
        },
      },
    });
    operations.push(sectionInsertOpertaion, sectionIndexInsertOperation);
    const comments = section.comments;
    processComments({ comments, parentLinkId: sectionLinkId });

    const chapters = section.chapters;

    chapters.forEach((chapter, chapterIndex) => {
      processChapter({ chapter, chapterIndex, sectionLinkId });
    });
  };

  json.sections.forEach((section, sectionIndex) => {
    processSection({ section, sectionIndex });
  });

  log({ operations });
  const result = await deep.serial({ operations });
  log({ result });
  return result;
}
