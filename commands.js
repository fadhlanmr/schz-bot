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

const ALL_COMMANDS = [
  THREAD_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, process.env.GUILD_ID, ALL_COMMANDS);
