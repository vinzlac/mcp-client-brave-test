# MCP Client with Brave Search

This project is an MCP (Model Context Protocol) client that uses the Brave Search API to perform web searches.

## Prerequisites

- Node.js (version 18 or higher)
- npm (usually installed with Node.js)
- A Brave Search API key

## Installation

1. Clone the repository:
```bash
git clone <your-repo>
cd <your-repo>
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create a `.env` file at the root of the project with the following environment variables:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Build and Launch

To build and run the project:

```bash
# Build the project
npm run build

# Launch the server with Brave API key
node dist/index.js "BRAVE_API_KEY=your_brave_api_key npx @modelcontextprotocol/server-brave-search"
```

## Usage

Once the server is running, you can interact with it through the console. Type your queries and press Enter. To quit, type "quit".

## Project Structure

```
.
├── src/
│   └── index.ts      # Main entry point
├── dist/             # Compiled code (generated)
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── .env             # Environment variables (to be created)
```

## Main Dependencies

- `@modelcontextprotocol/sdk` : SDK for the MCP protocol
- `@anthropic-ai/sdk` : SDK for the Claude API
- `dotenv` : Environment variables management

## Available Scripts

- `npm run build` : Compile TypeScript code
- `npm start` : Launch the server (requires command line argument)
- `npm run dev` : Launch the server in development mode with auto-reload

## Notes

- Make sure your Brave Search API key is valid
- The server uses the MCP protocol to communicate with Brave Search
- Search results are processed through the Claude API for better understanding
- You can customize the server command by passing it as a command line argument 