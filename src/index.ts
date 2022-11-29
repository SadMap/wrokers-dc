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
		const subdomain = new URL(request.url).hostname.split('.')[0]
		// Get path from request
		const path = new URL(request.url).pathname
		if (subdomain === "www" || subdomain === "akp" && path === "/") {
			const html = await fetch("https://raw.githubusercontent.com/SadMap/wrokers-dc/main/index.html")
			return new Response(html.body, {
				status: 200,
				headers: {
					"content-type": "text/html;charset=UTF-8",
					"allow-origin": "*",
				},
			})
		}
		// API 
		if (subdomain === "api") {
			// Redirect Creation api
			if (path === "/shorten" && request.method === "POST") {
				const body = (await request.json()) as {
					subdomain: string | undefined,
					url: string | undefined,
					destination: string | undefined,
					imageurl: string | undefined,
					secret: string | undefined
				}
				const {destination,imageurl,secret} = body 
				let {subdomain,url} = body
				if (!subdomain) {
					subdomain = "akp"
				}
				if (!url) {
					url = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
				}
				if (!destination) {
					return new Response("Destination is required", {
						status: 400,
						headers: {
							"content-type": "text/plain;charset=UTF-8",
							"allow-origin": "*",
						},
					})
				}
				// Check if secret is correct
				const secretKey = await env.redirects.get(`${subdomain}-secret`)
				if (secretKey !== secret) {
					return new Response("Secret is incorrect", {
						status: 401,
						headers: {
							"content-type": "text/plain;charset=UTF-8",
							"allow-origin": "*",
						},
					})
				}
				if (!secretKey) {
					await env.redirects.put(`${subdomain}-secret`, secret)
				}
				await env.redirects.put(`${subdomain}/${url}`, destination)
				if (imageurl) {
					await env.redirects.put(`${subdomain}/${url}.png`, imageurl)
				}
				return new Response(`Successfully created redirect for ${subdomain}.akp.bar/${url}`, {
					status: 200,
					headers: {
						"content-type": "text/plain;charset=UTF-8",
						"allow-origin": "*",
					},
				})
			}
			// Redirect Deletion api
			if (path === "/delete" && request.method === "POST") {
				const body = (await request.json()) as {
					subdomain: string | undefined,
					url: string | undefined,
					secret: string | undefined
				}
				const {secret} = body
				let {subdomain,url} = body
				if (!subdomain) {
					subdomain = "akp"
				}
				if (!url) {
					return new Response("URL is required", {
						status: 400
					})
				}
				// Check if secret is correct
				const secretKey = await env.redirects.get(`${subdomain}-secret`)
				if (secretKey !== secret) {
					return new Response("Secret is incorrect", {
						status: 401
					})
				}
				await env.redirects.delete(`${subdomain}/${url}`)
				await env.redirects.delete(`${subdomain}/${url}.png`)
				return new Response(`Successfully deleted redirect for ${subdomain}.akp.bar/${url}`, {
					status: 200
				})
			}
			// Cors
			if (path === "/shorten" || path === "delete" && request.method === "OPTIONS") {
				return new Response("OK", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": "https://akp.bar",
						"Access-Control-Allow-Methods": "POST,OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type"
					}
				})
			}
		}
		// Get value from KV
		const value = await env.redirects.get(`${subdomain ?? ""}${path}`);
		// Check if user agent is a bot
		const isBot = request.headers.get('user-agent')?.includes('Discordbot/2.0;') || request.headers.get('user-agent')?.includes("(Macintosh; Intel Mac OS X 11.6; rv:92.0)")
		// Check if value exists
		if (value && !isBot) {
			// Redirect to value
			console.log(value)
			return new Response(`<meta http-equiv="refresh" content="0; URL='${value}'" />`, {
				status: 302,
				headers: {
					'Location': value,
					},
					});

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
			return new Response(`Not Found ${subdomain??""}${path}`, {
				status: 404
			});
	},
};
