import * as tsutils from 'ts-api-utils';
import * as ts from 'typescript';

import type { TSESTree } from './ts-estree';

import { getLocFor } from './node-utils';
import { AST_TOKEN_TYPES } from './ts-estree';

/**
 * Convert all comments for the given AST.
 * @param ast the AST object
 * @param code the TypeScript code
 * @returns the converted ESTreeComment
 * @private
 */
export function convertComments(
  ast: ts.SourceFile,
  code: string,
): TSESTree.Comment[] {
  const comments: TSESTree.Comment[] = [];

  tsutils.forEachComment(
    ast,
    (_, comment) => {
      const type =
        comment.kind === ts.SyntaxKind.SingleLineCommentTrivia
          ? AST_TOKEN_TYPES.Line
          : AST_TOKEN_TYPES.Block;
      const range: TSESTree.Range = [comment.pos, comment.end];
      const loc = getLocFor(range, ast);

      // both comments start with 2 characters - /* or //
      const textStart = range[0] + 2;
      const textEnd =
        comment.kind === ts.SyntaxKind.SingleLineCommentTrivia
          ? // single line comments end at the end
            range[1] - textStart
          : // multiline comments end 2 characters early
            range[1] - textStart - 2;
      comments.push({
        type,
        loc,
        range,
        value: code.slice(textStart, textStart + textEnd),
      });
    },
    ast,
  );

  return comments;
}
