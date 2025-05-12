import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import { createInterface } from 'readline';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ListToolsResultSchema, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

dotenv.config();

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

type MessageRole = 'user' | 'assistant';

interface Message {
  role: MessageRole;
  content: string | any[];
}

class MCPClient {
  private session: any = null;
  private anthropic: Anthropic;
  private client: Client;
  private transport!: StdioClientTransport;
  private schemas: { ListToolsResultSchema: any; CallToolResultSchema: any };

  constructor() {
    this.client = new Client({
      name: 'mcp-client',
      version: '1.0.0'
    });
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.schemas = { ListToolsResultSchema, CallToolResultSchema };
  }

  async connectToExistingServer(): Promise<void> {
    // Create server parameters for the existing server
    const env = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([_, value]) => value !== undefined)
      )
    } as Record<string, string>;

    // Get server command from command line arguments
    const serverCommand = process.argv[2];
    if (!serverCommand) {
      throw new Error('Please provide the server command as a command line argument. Example: node dist/index.js "BRAVE_API_KEY=your_key npx @modelcontextprotocol/server-brave-search"');
    }

    // Parse the server command
    const [envVars, ...commandParts] = serverCommand.split(' ');
    const [key, value] = envVars.split('=');
    env[key] = value;

    const serverParams = {
      command: commandParts[0],
      args: commandParts.slice(1),
      env
    };

    console.log('Starting server with command:', serverCommand);

    // Create stdio transport
    this.transport = new StdioClientTransport(serverParams);

    // Connect the client
    await this.client.connect(this.transport);
    this.session = this.client;

    // List available tools
    const response = await this.session.request({
      method: 'tools/list',
      params: {}
    }, this.schemas.ListToolsResultSchema);
    const tools = response.tools;
    console.log('\nConnected to server with tools:', tools.map((tool: Tool) => tool.name));
  }

  async processQuery(query: string): Promise<string> {
    if (!this.session) {
      throw new Error('Not connected to server');
    }

    const messages: Message[] = [
      {
        role: 'user',
        content: query
      }
    ];

    const response = await this.session.request({
      method: 'tools/list',
      params: {}
    }, this.schemas.ListToolsResultSchema);
    const availableTools = response.tools.map((tool: Tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));

    // Initial Claude API call
    const claudeResponse = await this.anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      messages: messages as any,
      tools: availableTools
    });

    const finalText: string[] = [];
    const assistantMessageContent: any[] = [];

    for (const content of claudeResponse.content) {
      if (content.type === 'text') {
        finalText.push(content.text);
        assistantMessageContent.push(content);
      } else if (content.type === 'tool_use') {
        const toolName = content.name;
        const toolArgs = content.input;

        // Execute tool call
        console.log('Debug - Executing tool call:', {
          toolName,
          toolArgs,
          session: !!this.session
        });
        const result = await this.session.request({
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: toolArgs
          }
        }, this.schemas.CallToolResultSchema);
        console.log('Debug - Tool call result:', result);
        finalText.push(`[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`);

        assistantMessageContent.push(content);
        messages.push({
          role: 'assistant',
          content: assistantMessageContent
        });
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: content.id,
              content: result.content
            }
          ]
        });

        // Get next response from Claude
        const nextResponse = await this.anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 1000,
          messages: messages as any,
          tools: availableTools
        });

        if (nextResponse.content[0].type === 'text') {
          finalText.push(nextResponse.content[0].text);
        }
      }
    }

    return finalText.join('\n');
  }

  async chatLoop(): Promise<void> {
    console.log('\nMCP Client Started!');
    console.log('Type your queries or "quit" to exit.');

    const readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    while (true) {
      try {
        const query = await new Promise<string>(resolve => {
          readline.question('\nQuery: ', (answer: string) => {
            resolve(answer.trim());
          });
        });

        if (query.toLowerCase() === 'quit') {
          break;
        }

        const response = await this.processQuery(query);
        console.log('\n' + response);
      } catch (error) {
        console.error('\nError:', error);
      }
    }

    readline.close();
  }

  async cleanup(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
  }
}

async function main() {
  console.log('SDK structure:', Object.keys({ Client }));
  const client = new MCPClient();
  try {
    await client.connectToExistingServer();
    await client.chatLoop();
  } finally {
    await client.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 