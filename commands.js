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
          description: "How much",
          required: false,
          min_value: 2,
          max_value: 25,
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
          description: "How much",
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

const ALL_COMMANDS = [
  THREAD_COMMAND,
  REPLY_COMMAND,
];

InstallGuildCommands(process.env.APP_ID, process.env.GUILD_ID, ALL_COMMANDS);
InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
