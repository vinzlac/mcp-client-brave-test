declare module '@modelcontextprotocol/sdk' {
  export class ClientSession {
    initialize(): Promise<void>;
    listTools(): Promise<{ tools: any[] }>;
    callTool(name: string, args: any): Promise<{ content: any }>;
  }
  export class StdioServerParameters {
    constructor(params: { command: string; args: string[]; env: any });
  }
  export function stdioClient(params: StdioServerParameters): Promise<[any, any]>;
  export class AsyncExitStack {
    enterAsyncContext<T>(context: T): Promise<T>;
    aclose(): Promise<void>;
  }
} 