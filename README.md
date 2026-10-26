```
npm install
```
### Get app credentials

Fetch the credentials from your app's settings and add them to a `.env` file (see `.env.sample` for an example). You'll need your app ID (`APP_ID`), bot token (`DISCORD_TOKEN`), and public key (`PUBLIC_KEY`).

```
npm run register
```

### Run the app

After your credentials are added, go ahead and run the app:

```
node app.js
```

> ⚙️ A package [like `nodemon`](https://github.com/remy/nodemon), which watches for local changes and restarts your app, may be helpful while locally developing.

### Jump into chat

`/schizo` uses recent conversation instead of a typed prompt:

```
/schizo
/schizo mode:thread board:g count:3
/schizo mode:thread boards:g count:3
/schizo mode:thread boards:g,vg,v count:5
/schizo mode:llm count:5
```

- `mode` defaults to `thread`. `count` defaults to 5 and accepts 2–5.
- Reads text messages before the command in the same channel, oldest first. Bot messages, webhooks, slash commands and empty messages are skipped. Uses fewer messages if that is all it can find, scanning at most 150 recent messages.
- To target a message, right-click / long-press it and choose **Apps → Schizo - LLM** or **Apps → Schizo - Thread Reply**. These use the selected text message plus up to four preceding chat messages, with the selected message as the main topic. If history cannot be fetched, the selected message alone is used.
- Thread mode extracts topic keywords, searches thread titles and opening posts on 1–3 chosen boards, then picks a random text reply from a matching thread. Matches from all boards share one relevance-weighted pool; the main chat message and thread titles have more weight. Opening posts, image-only posts and quote-reference-only replies are excluded. The response shows its source board and links to the original post; the individual reply may be a non sequitur. No LLM is needed for this mode.
- `boards` accepts one board or comma-separated names, for example `g` or `g,vg,v`. Spaces, uppercase names and surrounding slashes are normalized, and duplicates count once. At most three unique boards are allowed. The existing `board` option still works; if both options are supplied, `boards` wins.
- `SCHIZO_BOARDS` sets the default board list, including for the thread context-menu action. Use `SCHIZO_BOARDS=g` for one board or `SCHIZO_BOARDS=g,vg,v` for three. If empty or unset, the older `SCHIZO_BOARD` setting is used, then `g`. An explicit `board` or `boards` option overrides these defaults.
- If one board is unavailable or has no matches, the others are still searched. Up to three matching threads per board are tried when threads are deleted or have no usable text replies. If no usable reply is found, the bot returns a no-match message or a service error.

These commands are server-installed, server-channel commands. Invite the bot with **View Channel** and **Read Message History**, and enable **Message Content Intent** in the Discord Developer Portal (approval is needed if Discord requires it for your app). Context-menu actions receive the selected message directly; surrounding history still requires access. The existing thread/reply commands keep their existing contexts.

For LLM mode, set `LLM_MODEL`, `LLM_BASE_URL` and your provider's `LLM_API_KEY` in `.env`. The endpoint must support OpenAI-compatible `/chat/completions`; for example:

```
# OpenAI
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=<YOUR_API_KEY>

# Or local Ollama, using a model you have pulled
# LLM_BASE_URL=http://localhost:11434/v1
# LLM_MODEL=llama3.2
# LLM_API_KEY=
```

LLM mode sends the collected text and speaker labels to the configured provider. Responses are short, chaotic internet-style reactions. Both modes acknowledge the command immediately and edit the response when ready; generated or quoted mentions do not ping users or roles.

Run `npm run register` after configuring credentials to install the new slash and message commands, then restart the app after changing environment settings.

### Checks

Run `npm test` for offline context, reply-selection, LLM and message-component checks. No Discord or provider credentials are needed for these checks.
