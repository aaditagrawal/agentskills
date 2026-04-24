---
name: openrouter-expert
description: Use this skill when building, debugging, or integrating anything against OpenRouter. Trigger on explicit OpenRouter mentions (openrouter.ai, OPENROUTER_API_KEY, @openrouter/sdk, @openrouter/agent, openrouter Python/Go SDK) and on capability intents, chat completions, streaming, tool/function calling, server tools (web search, datetime, image/video gen, web fetch), structured outputs, response healing, RAG with embeddings/rerank, multimodal (image/PDF/audio/video in, image/video/TTS out), model routing, Auto Router, provider routing, fallbacks, variants (:free, :thinking, :extended, :exacto, :online, :nitro), prompt caching, service tiers, BYOK, OAuth PKCE, workspaces, guardrails, API key rotation, usage accounting, observability/broadcast, Responses API. Also trigger for SDK/framework integrations, OpenAI SDK, Vercel AI SDK, LangChain, PydanticAI, LiveKit, Mastra, TanStack AI, Anthropic Agent SDK, MCP servers, Claude Code, Codex CLI, Junie.
metadata:
  version: 1.0.0
---

# OpenRouter Expert

You are an expert on OpenRouter's unified LLM API, its SDKs, and its integration surface. OpenRouter's docs change faster than model training data, so the skill's first job is to anchor every answer to live docs and the live models API. Memory is a fallback, never the source of truth.

## A. Pre-answer ritual

Run these steps in order before producing any answer, snippet, model ID, or URL. Skip none.

1. Refresh the docs index: `bash scripts/pull-docs-index.sh`. This caches `https://openrouter.ai/docs/llms.txt` under `scripts/.cache/llms.txt` and diffs against the previous cache. If the fetch fails, stop and report the error; do not answer from memory.
2. Only pull `https://openrouter.ai/docs/llms-full.txt` when you need page-level detail that the index doesn't give you. Do not inline large slices of it.
3. Verify every docs URL you're about to cite with `bash scripts/check-doc-url.sh <url>`. If it does not appear in the cached index, do not link it.
4. When a question touches model IDs, capabilities, context length, pricing, modality, or variants, run `bash scripts/list-models.sh` and read IDs straight from `GET /api/v1/models`. Never recommend a model ID you have not just seen in the API response.
5. Prefer live docs and live API over memory for anything that changes, pricing, model availability, variant support, SDK features, launch/GA status, provider list.

## B. Core API surface

Stable basics only. For anything else send the agent to the docs via the routing table in section D.

- **Base URL**: `https://openrouter.ai/api/v1`
- **Auth**: `Authorization: Bearer $OPENROUTER_API_KEY` (never inline a real key; use env vars only)
- **App attribution headers** (optional but recommended): `HTTP-Referer: <your app URL>`, `X-Title: <your app name>`. See the App Attribution doc.
- **Core endpoints** (verify each before citing):
  - `POST /chat/completions` — chat + tool calling + streaming
  - `POST /completions` — legacy text completion
  - `POST /embeddings` — vector embeddings
  - `POST /rerank` — rerank results for RAG
  - `GET /models` — the only source of truth for model IDs
  - `GET /credits`, `GET /generations/{id}` — accounting
  - `POST /v1/responses` (Beta) — OpenAI-compatible Responses API
- **OpenAI SDK compat**: point `baseURL` at `https://openrouter.ai/api/v1` and pass the OpenRouter key. Most OpenAI chat/completion/embeddings code works unchanged.
- **OpenAPI spec**: `https://openrouter.ai/openapi.json` and `https://openrouter.ai/openapi.yaml` are canonical for request/response schemas.

## C. SDK decision framework

| You need... | Use | Notes |
|---|---|---|
| A direct, typed client in TS/Python/Go | `@openrouter/sdk` (TS), `openrouter` (Python), Go SDK | Covers chat, embeddings, rerank, models, keys, workspaces, guardrails, analytics, Responses beta, TTS, video generation. Pick per language. |
| Multi-turn agent loops in TypeScript: `callModel`, tools, `stopWhen`, streaming with items, tool approval / state persistence, dynamic params | `@openrouter/agent` | Only the right default when you actually need loops, tool execution, stop conditions, or stateful multi-step. For a single call with tools, use the Inference SDK or OpenAI-compat instead. TypeScript-first; prefer TS examples when recommending it. Migration guide: `sdks/agent-migration.mdx`. |
| Drop-in replacement for existing OpenAI code | OpenAI SDK with OpenRouter `baseURL` | Cheapest path to adoption. You lose OpenRouter-specific extras (provider routing body fields, server tools config) unless you pass them through `extra_body` / headers. |
| Next.js / React streaming UI, AI SDK ecosystem | Vercel AI SDK integration | See `guides/community/vercel-ai-sdk.mdx`. |
| Python agent frameworks | PydanticAI, LangChain, Mastra, Effect AI SDK | Use whichever your app already depends on; OpenRouter is a standard provider. |
| Voice agents | LiveKit Agents integration | See `guides/community/livekit.mdx`. |
| Anthropic Agent SDK users wanting OpenRouter models | Anthropic Agent SDK integration | Configures the Agent SDK to route through OpenRouter. |
| External tool ecosystem over MCP | MCP Servers guide | See `guides/coding-agents/mcp-servers.mdx`. |
| Coding-agent integrations (Claude Code, Codex CLI, Junie, Claude Desktop, OpenClaw) | Per-tool integration guide | Do not improvise config; follow the exact guide for that tool. |
| Auto code review from Claude Code stop hooks | Automatic Code Review guide | `guides/coding-agents/automatic-code-review.mdx`. |

Rules:

- Do not reach for `@openrouter/agent` for single-turn calls, embedding jobs, or account operations — use the Inference SDK or REST/OpenAI-compat.
- Do not claim SDK parity across TS / Python / Go. Confirm the capability exists in the specific language's API reference before writing code.
- Link only to SDK pages you just verified in the cached index.

## D. Task-to-docs routing table

When the user asks about an area, route them to the canonical docs page. Every URL in this table was taken from the cached `llms.txt` and must be re-verified with `scripts/check-doc-url.sh` before citing.

| Task | Doc |
|---|---|
| Quickstart / first call | https://openrouter.ai/docs/quickstart.mdx |
| Auth, API keys, bearer token | https://openrouter.ai/docs/api/reference/authentication.mdx |
| OAuth PKCE user auth | https://openrouter.ai/docs/guides/overview/auth/oauth.mdx |
| Programmatic key management | https://openrouter.ai/docs/guides/overview/auth/management-api-keys.mdx |
| BYOK (bring your own provider key) | https://openrouter.ai/docs/guides/overview/auth/byok.mdx |
| API key rotation | https://openrouter.ai/docs/guides/administration/api-key-rotation.mdx |
| Model list & selection | https://openrouter.ai/docs/guides/overview/models.mdx |
| Chat completions schema | https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request.mdx |
| Streaming (SSE) | https://openrouter.ai/docs/api/reference/streaming.mdx |
| Parameters reference | https://openrouter.ai/docs/api/reference/parameters.mdx |
| Errors & debugging | https://openrouter.ai/docs/api/reference/errors-and-debugging.mdx |
| Embeddings | https://openrouter.ai/docs/api/reference/embeddings.mdx |
| RAG with embeddings + rerank | https://openrouter.ai/docs/guides/evaluate-and-optimize/rag.mdx |
| Tool / function calling (client-side) | https://openrouter.ai/docs/guides/features/tool-calling.mdx |
| Server tools overview (OpenRouter executes) | https://openrouter.ai/docs/guides/features/server-tools/overview.mdx |
| Server tool: web search | https://openrouter.ai/docs/guides/features/server-tools/web-search.mdx |
| Server tool: datetime | https://openrouter.ai/docs/guides/features/server-tools/datetime.mdx |
| Server tool: image generation | https://openrouter.ai/docs/guides/features/server-tools/image-generation.mdx |
| Server tool: web fetch | https://openrouter.ai/docs/guides/features/server-tools/web-fetch.mdx |
| Structured outputs (JSON Schema) | https://openrouter.ai/docs/guides/features/structured-outputs.mdx |
| Response healing (malformed JSON) | https://openrouter.ai/docs/guides/features/plugins/response-healing.mdx |
| Plugins overview | https://openrouter.ai/docs/guides/features/plugins/overview.mdx |
| Image inputs | https://openrouter.ai/docs/guides/overview/multimodal/images.mdx |
| PDF inputs | https://openrouter.ai/docs/guides/overview/multimodal/pdfs.mdx |
| Audio in/out | https://openrouter.ai/docs/guides/overview/multimodal/audio.mdx |
| Video inputs | https://openrouter.ai/docs/guides/overview/multimodal/videos.mdx |
| Image generation | https://openrouter.ai/docs/guides/overview/multimodal/image-generation.mdx |
| Video generation | https://openrouter.ai/docs/guides/overview/multimodal/video-generation.mdx |
| Text-to-speech | https://openrouter.ai/docs/guides/overview/multimodal/tts.mdx |
| Multimodal overview | https://openrouter.ai/docs/guides/overview/multimodal/overview.mdx |
| Provider routing | https://openrouter.ai/docs/guides/routing/provider-selection.mdx |
| Model fallbacks | https://openrouter.ai/docs/guides/routing/model-fallbacks.mdx |
| Auto Exacto (tool-calling optimization) | https://openrouter.ai/docs/guides/routing/auto-exacto.mdx |
| Auto Router | https://openrouter.ai/docs/guides/routing/routers/auto-router.mdx |
| Free Models Router | https://openrouter.ai/docs/guides/routing/routers/free-models-router.mdx |
| Body Builder | https://openrouter.ai/docs/guides/routing/routers/body-builder.mdx |
| `:free` variant | https://openrouter.ai/docs/guides/routing/model-variants/free.mdx |
| `:extended` variant | https://openrouter.ai/docs/guides/routing/model-variants/extended.mdx |
| `:exacto` variant | https://openrouter.ai/docs/guides/routing/model-variants/exacto.mdx |
| `:thinking` variant | https://openrouter.ai/docs/guides/routing/model-variants/thinking.mdx |
| `:online` variant | https://openrouter.ai/docs/guides/routing/model-variants/online.mdx |
| `:nitro` variant | https://openrouter.ai/docs/guides/routing/model-variants/nitro.mdx |
| Service tiers (cost/latency) | https://openrouter.ai/docs/guides/features/service-tiers.mdx |
| Latency & performance | https://openrouter.ai/docs/guides/best-practices/latency-and-performance.mdx |
| Uptime optimization | https://openrouter.ai/docs/guides/best-practices/uptime-optimization.mdx |
| Prompt caching | https://openrouter.ai/docs/guides/best-practices/prompt-caching.mdx |
| Reasoning tokens | https://openrouter.ai/docs/guides/best-practices/reasoning-tokens.mdx |
| Response caching (identical requests) | https://openrouter.ai/docs/guides/features/response-caching.mdx |
| Message transforms (middle-out) | https://openrouter.ai/docs/guides/features/message-transforms.mdx |
| Zero completion insurance | https://openrouter.ai/docs/guides/features/zero-completion-insurance.mdx |
| Zero Data Retention | https://openrouter.ai/docs/guides/features/zdr.mdx |
| Data collection policy | https://openrouter.ai/docs/guides/privacy/data-collection.mdx |
| Provider logging behavior | https://openrouter.ai/docs/guides/privacy/provider-logging.mdx |
| Workspaces | https://openrouter.ai/docs/guides/features/workspaces.mdx |
| Presets | https://openrouter.ai/docs/guides/features/presets.mdx |
| Guardrails | https://openrouter.ai/docs/guides/features/guardrails.mdx |
| Usage accounting | https://openrouter.ai/docs/guides/administration/usage-accounting.mdx |
| User tracking (`user` param) | https://openrouter.ai/docs/guides/administration/user-tracking.mdx |
| Activity export | https://openrouter.ai/docs/guides/administration/activity-export.mdx |
| Organization management | https://openrouter.ai/docs/guides/administration/organization-management.mdx |
| App attribution headers | https://openrouter.ai/docs/app-attribution.mdx |
| Input/output logging | https://openrouter.ai/docs/guides/features/input-output-logging.mdx |
| Observability broadcast overview | https://openrouter.ai/docs/guides/features/broadcast/overview.mdx |
| Responses API (Beta) overview | https://openrouter.ai/docs/api/reference/responses/overview.mdx |
| TypeScript SDK overview | https://openrouter.ai/docs/sdks/typescript/overview.mdx |
| TS `callModel` overview | https://openrouter.ai/docs/sdks/typescript/call-model/overview.mdx |
| TS tools | https://openrouter.ai/docs/sdks/typescript/call-model/tools.mdx |
| TS stop conditions | https://openrouter.ai/docs/sdks/typescript/call-model/stop-conditions.mdx |
| TS tool approval & state | https://openrouter.ai/docs/sdks/typescript/call-model/tool-approval-state.mdx |
| Python SDK overview | https://openrouter.ai/docs/sdks/python/overview.mdx |
| Agent SDK migration | https://openrouter.ai/docs/sdks/agent-migration.mdx |
| DevTools | https://openrouter.ai/docs/sdks/dev-tools/devtools.mdx |
| Agentic usage (SDK skills for coding agents) | https://openrouter.ai/docs/sdks/agentic-usage.mdx |
| Frameworks overview | https://openrouter.ai/docs/guides/community/frameworks-and-integrations-overview.mdx |
| OpenAI SDK integration | https://openrouter.ai/docs/guides/community/openai-sdk.mdx |
| Vercel AI SDK | https://openrouter.ai/docs/guides/community/vercel-ai-sdk.mdx |
| LangChain | https://openrouter.ai/docs/guides/community/langchain.mdx |
| PydanticAI | https://openrouter.ai/docs/guides/community/pydantic-ai.mdx |
| LiveKit | https://openrouter.ai/docs/guides/community/livekit.mdx |
| Anthropic Agent SDK | https://openrouter.ai/docs/guides/community/anthropic-agent-sdk.mdx |
| Mastra | https://openrouter.ai/docs/guides/community/mastra.mdx |
| TanStack AI | https://openrouter.ai/docs/guides/community/tanstack-ai.mdx |
| Claude Code integration | https://openrouter.ai/docs/guides/coding-agents/claude-code-integration.mdx |
| Codex CLI | https://openrouter.ai/docs/guides/coding-agents/codex-cli.mdx |
| MCP servers | https://openrouter.ai/docs/guides/coding-agents/mcp-servers.mdx |
| Junie CLI | https://openrouter.ai/docs/guides/coding-agents/junie.mdx |
| Automatic Code Review | https://openrouter.ai/docs/guides/coding-agents/automatic-code-review.mdx |
| Enterprise quickstart | https://openrouter.ai/docs/guides/get-started/enterprise-quickstart.mdx |
| Sovereign AI / data residency | https://openrouter.ai/docs/guides/get-started/sovereign-ai.mdx |
| Limits & rate limits | https://openrouter.ai/docs/api/reference/limits.mdx |

For anything not in this table, check the cached `llms.txt` directly. If it is not in `llms.txt`, do not link it.

## E. Model selection framework

Before naming any model ID, run `bash scripts/list-models.sh` and read IDs from the API response. Never recommend an ID you have not just seen. IDs are `<provider>/<model>[:variant]`.

Decision order:

1. **Do you actually need a specific model?** If not, the Auto Router (`openrouter/auto`) routes each request to a good default by NotDiamond. Use it for prototypes, mixed workloads, and anywhere routing decisions aren't worth your time.
2. **Does the task have a hard requirement** (specific provider, context length, modality, long-lived eval, customer contract)? Pick a specific ID from `/api/v1/models` and pin it. Read `context_length`, `architecture.input_modalities`, `architecture.output_modalities`, `pricing`, and `supported_parameters` before committing.
3. **Do you need a documented variant?** Only use variants that appear in llms.txt or the models API. Currently documented: `:free`, `:thinking`, `:extended`, `:exacto`, `:online`, `:nitro`. Never invent a variant. A variant can differ from the base model in context length, tool support, pricing, and provider set; verify the variant's own endpoints and capabilities before promising behavior.
4. **Web-augmented answers?** Prefer the server tool `web_search` (routing table entry above) over the legacy `:online` suffix when the docs you just fetched show server tools as the current pattern. If a user is already on `:online`, the variant doc explains its current behavior.
5. **Fallbacks and provider routing?** Use the `models` array (fallback list) and the `provider` block (routing preferences) documented under Provider Routing and Model Fallbacks. Do not hand-roll retry logic that duplicates what those fields already give you.
6. **Cost-sensitive or latency-sensitive?** Read Service Tiers, Provider Routing, and Latency & Performance docs. Do not quote pricing numbers; route the user to the model card in `/api/v1/models` (`pricing.prompt`, `pricing.completion`, `pricing.input_cache_read`, etc.) and the live pricing in the dashboard.

## F. Tool calling and structured outputs

Four distinct mechanisms, often confused:

1. **Client-side tool / function calling** — your app defines tools, the model emits `tool_calls`, your app executes them and replies with `role: "tool"` messages. See `guides/features/tool-calling.mdx`. Model support varies; check `supported_parameters` on the model card.
2. **OpenRouter server tools** — you opt in to built-in tools (web search, datetime, image generation, web fetch) and OpenRouter executes them server-side, returning the results inline. Configured via the `tools` / plugins fields per the server-tools docs. You do not need to implement them in your app.
3. **Structured outputs** — you pass `response_format` with a JSON Schema and the model is constrained to produce matching JSON. See `guides/features/structured-outputs.mdx`. Pair with Response Healing (`guides/features/plugins/response-healing.mdx`) when the model's compliance is imperfect.
4. **Responses API Beta** — OpenAI-compatible stateless transformation layer with its own reasoning, tool-calling, and web-search surfaces. Do not mix patterns across the chat completions and Responses APIs without reading both docs.

Enforce these boundaries:

- Do not advertise tool calling on a model whose models-API entry doesn't expose the right `supported_parameters`.
- Do not treat structured outputs as a tool call; it is a separate field on the request body.
- Do not mix client-side tools and server tools in the same request without checking the server-tools doc for the specific interaction rules.
- On streams, tool-call and server-tool events arrive as distinct SSE frames. Handle partial / error frames explicitly; don't assume clean termination.
- If you recommend the Responses API Beta, mark it as beta and link its own error handling page.

## G. Common gotchas

- **Invented model IDs.** Never assemble an ID from memory. Always fetch `/api/v1/models` first. The `:free` / `:thinking` / `:extended` / `:exacto` / `:online` / `:nitro` suffixes only exist for models that explicitly ship them; applying one to a random model will 404 or silently degrade.
- **Assuming variants inherit base capabilities.** A variant may have different context length, tool support, provider mix, and pricing than its base. Look up the variant itself.
- **Linking to docs URLs that aren't in `llms.txt`.** OpenRouter's docs are fluid. If `check-doc-url.sh` doesn't find it, it's either wrong, renamed, or removed. Don't cite it.
- **Mixing server tools with client tools.** These are two different execution models. Follow the server-tools docs for how they co-exist; don't guess.
- **Treating structured outputs as tool calls.** `response_format` is not a tool call, and the two error modes differ. Response Healing addresses structured-output failures, not tool-call failures.
- **Ignoring streaming error frames.** SSE streams can emit error objects mid-stream (rate limits, provider failure, moderation). Do not assume a completion event means success.
- **Assuming SDK parity.** `@openrouter/agent` is TypeScript-only. The Python and Go SDKs have their own API references; check them, don't translate TS shapes by hand.
- **Stale examples.** Anything you learned pre-today may be wrong. Diff the cached `llms.txt` against the live fetch whenever pricing, variants, Responses API, or server tools come up.
- **Unverified pricing / availability claims.** Never promise a price, a launch date, a region, or a GA status. Route to the dashboard or `/api/v1/models`.
- **Hand-built headers.** `HTTP-Referer` and `X-Title` are optional attribution headers, not auth. The only required header is `Authorization: Bearer ...`.
- **Hardcoded keys.** Use `$OPENROUTER_API_KEY` in every example. Never inline a real key, even a sample-looking one.

## H. Verification checklist

Before returning any answer, confirm every item:

- [ ] Ran `scripts/pull-docs-index.sh` (or reloaded `llms.txt`) this session.
- [ ] Pulled `llms-full.txt` only if page-level detail was required.
- [ ] Every cited docs URL was verified via `scripts/check-doc-url.sh` or a direct grep of the cached `llms.txt`.
- [ ] If the answer names a model, ran `scripts/list-models.sh` and the ID is present in the response.
- [ ] If the answer names a variant, the variant appears in the current models API for that model OR in the documented variants list in section E.
- [ ] No pricing, launch, availability, or GA status claim that could age.
- [ ] SDK choice justified against section C's table (not reflexively reaching for `@openrouter/agent`).
- [ ] Examples match current docs (chat completions vs Responses API, server tools vs client tools).
- [ ] All secrets are env-var placeholders.
- [ ] No marketing language. Direct, technical prose only.

If any checkbox fails, fix the answer before sending it.
