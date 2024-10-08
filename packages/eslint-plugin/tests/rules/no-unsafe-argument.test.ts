import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../../src/rules/no-unsafe-argument';
import { getFixturesRootDir } from '../RuleTester';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: getFixturesRootDir(),
    },
  },
});

ruleTester.run('no-unsafe-argument', rule, {
  valid: [
    // unknown function should be ignored
    `
doesNotExist(1 as any);
    `,
    // non-function call should be ignored
    `
const foo = 1;
foo(1 as any);
    `,
    // too many arguments should be ignored as this is a TS error
    `
declare function foo(arg: number): void;
foo(1, 1 as any, 2 as any);
    `,
    `
declare function foo(arg: number, arg2: string): void;
foo(1, 'a');
    `,
    `
declare function foo(arg: any): void;
foo(1 as any);
    `,
    `
declare function foo(arg: unknown): void;
foo(1 as any);
    `,
    `
declare function foo(...arg: number[]): void;
foo(1, 2, 3);
    `,
    `
declare function foo(...arg: any[]): void;
foo(1, 2, 3, 4 as any);
    `,
    `
declare function foo(arg: number, arg2: number): void;
const x = [1, 2] as const;
foo(...x);
    `,
    `
declare function foo(arg: any, arg2: number): void;
const x = [1 as any, 2] as const;
foo(...x);
    `,
    `
declare function foo(arg1: string, arg2: string): void;
const x: string[] = [];
foo(...x);
    `,
    `
function foo(arg1: number, arg2: number) {}
foo(...([1, 1, 1] as [number, number, number]));
    `,
    `
declare function foo(arg1: Set<string>, arg2: Map<string, string>): void;

const x = [new Map<string, string>()] as const;
foo(new Set<string>(), ...x);
    `,
    `
declare function foo(arg1: unknown, arg2: Set<unkown>, arg3: unknown[]): void;
foo(1 as any, new Set<any>(), [] as any[]);
    `,
    `
declare function foo(...params: [number, string, any]): void;
foo(1, 'a', 1 as any);
    `,
    // Unfortunately - we cannot handle this case because TS infers `params` to be a tuple type
    // that tuple type is the same as the type of
    `
declare function foo<E extends string[]>(...params: E): void;

foo('a', 'b', 1 as any);
    `,
    `
declare function toHaveBeenCalledWith<E extends any[]>(...params: E): void;
toHaveBeenCalledWith(1 as any);
    `,
    // https://github.com/typescript-eslint/typescript-eslint/issues/2109
    `
declare function acceptsMap(arg: Map<string, string>): void;
acceptsMap(new Map());
    `,
    `
type T = [number, T[]];
declare function foo(t: T): void;
declare const t: T;

foo(t);
    `,
    `
type T = Array<T>;
declare function foo<T>(t: T): T;
const t: T = [];
foo(t);
    `,
    `
function foo(templates: TemplateStringsArray) {}
foo\`\`;
    `,
    `
function foo(templates: TemplateStringsArray, arg: any) {}
foo\`\${1 as any}\`;
    `,
  ],
  invalid: [
    {
      code: `
declare function foo(arg: number): void;
foo(1 as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 5,
          endColumn: 13,
          data: {
            sender: '`any`',
            receiver: '`number`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(arg: number): void;
foo(error);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 5,
          endColumn: 10,
          data: {
            sender: 'error typed',
            receiver: '`number`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(arg1: number, arg2: string): void;
foo(1, 1 as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 8,
          endColumn: 16,
          data: {
            sender: '`any`',
            receiver: '`string`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(...arg: number[]): void;
foo(1, 2, 3, 1 as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 14,
          endColumn: 22,
          data: {
            sender: '`any`',
            receiver: '`number`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(arg: string, ...arg: number[]): void;
foo(1 as any, 1 as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 5,
          endColumn: 13,
          data: {
            sender: '`any`',
            receiver: '`string`',
          },
        },
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 15,
          endColumn: 23,
          data: {
            sender: '`any`',
            receiver: '`number`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

foo(...(x as any));
      `,
      errors: [
        {
          messageId: 'unsafeSpread',
          line: 4,
          column: 5,
          endColumn: 18,
        },
      ],
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

foo(...(x as any[]));
      `,
      errors: [
        {
          data: { sender: '`any[]`' },
          messageId: 'unsafeArraySpread',
          line: 4,
          column: 5,
          endColumn: 20,
        },
      ],
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

declare const errors: error[];

foo(...errors);
      `,
      errors: [
        {
          data: { sender: 'error' },
          messageId: 'unsafeArraySpread',
          line: 6,
          column: 5,
          endColumn: 14,
        },
      ],
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

const x = ['a', 1 as any] as const;
foo(...x);
      `,
      errors: [
        {
          messageId: 'unsafeTupleSpread',
          line: 5,
          column: 5,
          endColumn: 9,
          data: {
            sender: 'of type `any`',
            receiver: '`number`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

const x = ['a', error] as const;
foo(...x);
      `,
      errors: [
        {
          messageId: 'unsafeTupleSpread',
          line: 5,
          column: 5,
          endColumn: 9,
          data: {
            sender: 'error typed',
            receiver: '`number`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;
foo(...(['foo', 1, 2] as [string, any, number]));
      `,
      errors: [
        {
          data: {
            sender: 'of type `any`',
            receiver: '`number`',
          },
          messageId: 'unsafeTupleSpread',
          line: 3,
          column: 5,
          endColumn: 48,
        },
      ],
    },
    {
      code: `
declare function foo(arg1: string, arg2: number, arg2: string): void;

const x = [1] as const;
foo('a', ...x, 1 as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 5,
          column: 16,
          endColumn: 24,
          data: {
            sender: '`any`',
            receiver: '`string`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(arg1: string, arg2: number, ...rest: string[]): void;

const x = [1, 2] as [number, ...number[]];
foo('a', ...x, 1 as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 5,
          column: 16,
          endColumn: 24,
          data: {
            sender: '`any`',
            receiver: '`string`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(arg1: Set<string>, arg2: Map<string, string>): void;

const x = [new Map<any, string>()] as const;
foo(new Set<any>(), ...x);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 5,
          column: 5,
          endColumn: 19,
          data: {
            sender: '`Set<any>`',
            receiver: '`Set<string>`',
          },
        },
        {
          messageId: 'unsafeTupleSpread',
          line: 5,
          column: 21,
          endColumn: 25,
          data: {
            sender: 'of type `Map<any, string>`',
            receiver: '`Map<string, string>`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(...params: [number, string, any]): void;
foo(1 as any, 'a' as any, 1 as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 5,
          endColumn: 13,
          data: {
            sender: '`any`',
            receiver: '`number`',
          },
        },
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 15,
          endColumn: 25,
          data: {
            sender: '`any`',
            receiver: '`string`',
          },
        },
      ],
    },
    {
      code: `
declare function foo(param1: string, ...params: [number, string, any]): void;
foo('a', 1 as any, 'a' as any, 1 as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 10,
          endColumn: 18,
          data: {
            sender: '`any`',
            receiver: '`number`',
          },
        },
        {
          messageId: 'unsafeArgument',
          line: 3,
          column: 20,
          endColumn: 30,
          data: {
            sender: '`any`',
            receiver: '`string`',
          },
        },
      ],
    },
    {
      code: `
type T = [number, T[]];
declare function foo(t: T): void;
declare const t: T;
foo(t as any);
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 5,
          column: 5,
          endColumn: 13,
          data: {
            sender: '`any`',
            receiver: '`T`',
          },
        },
      ],
    },
    {
      code: `
function foo(
  templates: TemplateStringsArray,
  arg1: number,
  arg2: any,
  arg3: string,
) {}
declare const arg: any;
foo<number>\`\${arg}\${arg}\${arg}\`;
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 9,
          column: 15,
          endColumn: 18,
          data: {
            sender: '`any`',
            receiver: '`number`',
          },
        },
        {
          messageId: 'unsafeArgument',
          line: 9,
          column: 27,
          endColumn: 30,
          data: {
            sender: '`any`',
            receiver: '`string`',
          },
        },
      ],
    },
    {
      code: `
function foo(templates: TemplateStringsArray, arg: number) {}
declare const arg: any;
foo\`\${arg}\`;
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 4,
          column: 7,
          endColumn: 10,
          data: {
            sender: '`any`',
            receiver: '`number`',
          },
        },
      ],
    },
    {
      code: `
type T = [number, T[]];
function foo(templates: TemplateStringsArray, arg: T) {}
declare const arg: any;
foo\`\${arg}\`;
      `,
      errors: [
        {
          messageId: 'unsafeArgument',
          line: 5,
          column: 7,
          endColumn: 10,
          data: {
            sender: '`any`',
            receiver: '`T`',
          },
        },
      ],
    },
  ],
});
