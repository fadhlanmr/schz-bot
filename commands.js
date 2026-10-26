import "dotenv/config";
import { InstallGlobalCommands, InstallGuildCommands } from "./utils.js";

// thread command
const THREAD_COMMAND = {
  name: "thread",
  type: 1,
  description: "Lurk Better",
  options: [
    {
      name: "top",
      description: "top thread",
      type: 1, // 1 is type SUB_COMMAND
      options: [
        {
          type: 3,
          name: "board",
          description: "Which Board",
          required: true,
        },
      ]
    },
    {
      name: "list",
      description: "list thread",
      type: 1,
      options: [
        {
          type: 3,
          name: "board",
          description: "Which Board",
          required: true,
        },
        {
          type: 4,
          name: "limit",
          description: "How much, default 2",
          required: false,
          min_value: 2,
          max_value: 25,
        },
      ]
    },
    {
      name: "general",
      description: "search general thread",
      type: 1,
      options: [
        {
          type: 3,
          name: "board",
          description: "Which Board",
          required: true,
        },
        {
          type: 3,
          name: "search",
          description: "what general",
          required: true,
        },
      ]
    },
    {
      name: "search",
      description: "search thread",
      type: 1,
      options: [
        {
          type: 3,
          name: "board",
          description: "Which Board",
          required: true,
        },
        {
          type: 3,
          name: "search",
          description: "what",
          required: true,
        },
      ]
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// thread reply command
const REPLY_COMMAND = {
  name: "reply",
  type: 1,
  description: "you lurked",
  options: [
    {
      name: "top",
      description: "top reply",
      type: 1, // 1 is type SUB_COMMAND
      options: [
        {
          type: 3,
          name: "board",
          description: "Which Board",
          required: true,
        },
        {
          type: 3,
          name: "thread",
          description: "what thread",
          required: true,
        },
      ]
    },
    {
      name: "list",
      description: "list reply",
      type: 1,
      options: [
        {
          type: 3,
          name: "board",
          description: "Which Board",
          required: true,
        },
        {
          type: 3,
          name: "thread",
          description: "what thread",
          required: true,
        },
        {
          type: 4,
          name: "limit",
          description: "How much, default 2",
          required: false,
          min_value: 2,
          max_value: 25,
        },
      ]
    },
    {
      name: "search",
      description: "search reply",
      type: 1,
      options: [
        {
          type: 3,
          name: "board",
          description: "Which Board",
          required: true,
        },
        {
          type: 3,
          name: "thread",
          description: "what thread",
          required: true,
        },
        {
          type: 3,
          name: "search",
          description: "what",
          required: true,
        },
      ]
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// schizo uses recent chat, message commands use the picked message
const SCHIZO_COMMAND = {
  name: "schizo",
  type: 1,
  description: "Jump into the conversation",
  options: [
    {
      name: "mode",
      description: "Where the response comes from, default thread",
      type: 3,
      choices: [
        { name: "Random thread reply", value: "thread" },
        { name: "LLM response", value: "llm" },
      ],
    },
    {
      name: "count",
      description: "How many chat messages, default 5",
      type: 4,
      min_value: 2,
      max_value: 5,
    },
    {
      name: "board",
      description: "Single board for thread mode, overrides the default boards",
      type: 3,
      max_length: 10,
    },
    {
      name: "boards",
      description: "1-3 boards separated by commas, like g,vg,v; overrides board",
      type: 3,
      max_length: 64,
    },
  ],
  integration_types: [0],
  contexts: [0],
};

const SCHIZO_LLM_COMMAND = {
  name: "Schizo - LLM",
  type: 3,
  integration_types: [0],
  contexts: [0],
};

const SCHIZO_THREAD_COMMAND = {
  name: "Schizo - Thread Reply",
  type: 3,
  integration_types: [0],
  contexts: [0],
};

const ALL_COMMANDS = [
  THREAD_COMMAND,
  REPLY_COMMAND,
  SCHIZO_COMMAND,
  SCHIZO_LLM_COMMAND,
  SCHIZO_THREAD_COMMAND,
];

InstallGuildCommands(process.env.APP_ID, process.env.GUILD_ID, ALL_COMMANDS);
InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
