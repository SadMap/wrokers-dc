/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	redirects: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		// Get subdomain from request
		const subdomain = request.headers.get('host')?.split('.')[0];
		// Get path from request
		const path = new URL(request.url).pathname;
		// Get value from KV
		const value = await env.redirects.get(`${subdomain ?? ""}${path}`);
		// Check if user agent is a bot
		const isBot = request.headers.get('user-agent')?.includes('Discordbot/2.0;') || request.headers.get('user-agent')?.includes("(Macintosh; Intel Mac OS X 11.6; rv:92.0)")
		// Check if value exists
		if (value && !isBot) {
			// Redirect to value
			return Response
				.redirect(value, 301);
		} else if (isBot) {
			const image = await env.redirects.get(`${subdomain ?? ""}${path}.png`);
			if (image) {
				return new Response(`
				<html>
					<head>
					<meta property="twitter:card" content="summary_large_image">
					<meta property="twitter:image" content="${image}">
					<meta property="twitter:player" content="${image}">
					<meta property="twitter:player:width" content="360">
					<meta property="twitter:player:height" content="640">
					</head>
				</html>
					`,{
					headers: {
						'content-type': 'text/html'
					}
					})
			}
		}
			return new Response('Not found', {
				status: 404
			});
	},
};
