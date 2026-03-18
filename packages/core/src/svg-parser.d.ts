declare module 'svg-parser' {
  interface Node {
    type: string;
    tagName?: string;
    properties?: Record<string, string | number>;
    children?: (Node | string)[];
  }

  interface RootNode {
    type: 'root';
    children: Node[];
  }

  export function parse(input: string): RootNode;
}
