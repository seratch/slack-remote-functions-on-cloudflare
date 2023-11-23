/*
Head to https://api.slack.com/reference/manifests#config-tokens
echo 'SLACK_TOOLING_REFRESH_TOKEN=xoxe-1-...' > .env
brew install bun
bun add -d bun-types
bun run src/manifest.ts
*/
import {
  ManifestParams,
  SlackAPIClient,
  SlackAPIClientOptions,
} from "slack-web-api-client";

const clientOptions: SlackAPIClientOptions = { logLevel: "DEBUG" };
const noTokenClient = new SlackAPIClient(undefined, clientOptions);

let accessToken = process.env.SLACK_TOOLING_ACCESS_TOKEN;
let needRefresh = true;
if (accessToken) {
  try {
    await noTokenClient.auth.test({ token: accessToken });
    needRefresh = false;
  } catch (e) {
    needRefresh = true;
  }
}
if (needRefresh) {
  const refreshToken = process.env.SLACK_TOOLING_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("SLACK_TOOLING_REFRESH_TOKEN must be set");
  }
  const response = await noTokenClient.tooling.tokens.rotate({
    refresh_token: refreshToken,
  });
  await Bun.write(
    ".env",
    `SLACK_TOOLING_ACCESS_TOKEN=${response.token}\nSLACK_TOOLING_REFRESH_TOKEN=${response.refresh_token}\n`,
  );
  accessToken = response.token;
}

const client = new SlackAPIClient(accessToken, clientOptions);
const authTest = await client.auth.test();

const manifest: ManifestParams = {
  _metadata: { major_version: 2 },
  display_information: { name: "Cloudflare App" },
  settings: {
    org_deploy_enabled: true,
    interactivity: {
      is_enabled: true,
      // brew install cloudflare/cloudflare/cloudflared
      // cloudflared tunnel --url http://localhost:3000
      request_url: "https://TODO.trycloudflare.com/",
    },
    event_subscriptions: {
      // brew install cloudflare/cloudflare/cloudflared
      // cloudflared tunnel --url http://localhost:3000
      request_url: "https://TODO.trycloudflare.com/",
      bot_events: ["app_mention"],
    },
  },
  features: {
    bot_user: { display_name: "Cloudflare App" },
  },
  oauth_config: {
    scopes: {
      bot: ["commands", "app_mentions:read", "chat:write", "chat:write.public"],
    },
  },
  functions: {
    hello: {
      title: "Say hello",
      description: "Say hello",
      input_parameters: {
        properties: {
          user_id: { type: "slack#/types/user_id" },
        },
        required: ["user_id"],
      },
      output_parameters: {
        properties: {
          user_id: { type: "slack#/types/user_id" },
        },
        required: ["user_id"],
      },
    },
  },
};
const creation = await client.apps.manifest.create({ manifest });

console.log("\n");
console.log("\n");
console.log("\n");
console.log(
  `!!! Visit https://api.slack.com/apps/${creation.app_id} to install the ap !!!`,
);
console.log("\n");
console.log("\n");
console.log("\n");
