import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// thread command
const THREAD_COMMAND = {
  name: 'thread',
  type: 1,
  description: 'Lurk Better',
  options: [
    {
      type: 3,
      name: 'board',
      description: 'Which Board',
      required: true,
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// thread command
const THREAD_LIST_COMMAND = {
  name: 'threads',
  type: 1,
  description: 'Lurk Better with list',
  options: [
    {
      type: 3,
      name: 'board',
      description: 'Which Board',
      required: true,
    },
    {
      type: 4,
      name: 'limit',
      description: 'How much',
      required: false,
      min_value: 1,
      max_value: 25
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// thread reply command
const REPLY_COMMAND = {
  name: 'reply',
  type: 1,
  description: 'you lurked',
  options: [
    {
      type: 3,
      name: 'board',
      description: 'Which Board',
      required: true,
    },
    {
      type: 3,
      name: 'thread',
      description: 'what thread',
      required: true,
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [
  THREAD_COMMAND,
  THREAD_LIST_COMMAND,
  REPLY_COMMAND
];

InstallGlobalCommands(process.env.APP_ID, process.env.GUILD_ID, ALL_COMMANDS);
