"""
Agent runtime.

Executes an agent run as a ReAct-style tool-calling loop:

    system prompt (+ memory + skill)
        ↓
    LLM completion (with tools)
        ↓  tool_calls?
        ├─ yes → run each tool, append results, loop
        └─ no  → final answer, done

Every step is persisted to `agent_steps` and emitted as an SSE event so the
frontend can render a live timeline. Sub-agents (multi-agent) are spawned via
the `spawn_agent` tool and executed concurrently, sharing the same memory.
"""
import asyncio
import json
from datetime import datetime
from uuid import UUID

from app.core.database import SessionLocal
from app.models.agent import Agent
from app.models.agent_run import AgentRun
from app.models.agent_step import AgentStep
from app.services import agent_tools, memory_service
from app.services.provider_service import has_enabled_providers
from app.services.router_service import route_completion
from app.services.llm_service import get_provider_config
from app.core.provider import chat_completion

MAX_ITERATIONS = 8
MAX_SUBAGENT_DEPTH = 1  # coordinator (0) may spawn workers (1); workers cannot spawn further


def _base_system_prompt() -> str:
    return (
        "You are an autonomous agent in OpenAgent Hub. You are given a goal and a set of tools. "
        "Work toward the goal step by step. Think about what to do, call tools when they help, and "
        "use their results. When you have enough information, give a complete final answer in Markdown. "
        "Only call tools that are actually useful — do not call a tool if you can already answer. "
        "Be concise in intermediate reasoning and thorough in your final answer."
    )


def create_run(
    db,
    user_id: UUID,
    goal: str,
    agent_id: UUID | None = None,
    skill_id: UUID | None = None,
    model: str | None = None,
    provider_id: UUID | None = None,
    conversation_id: UUID | None = None,
    parent_run_id: UUID | None = None,
    role: str | None = None,
) -> AgentRun:
    run = AgentRun(
        user_id=user_id,
        agent_id=agent_id,
        skill_id=skill_id,
        goal=goal,
        model=model,
        provider_id=provider_id,
        conversation_id=conversation_id,
        parent_run_id=parent_run_id,
        role=role,
        status="pending",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _record_step(
    db,
    run_id: UUID,
    index: int,
    step_type: str,
    content: str | None = None,
    tool_name: str | None = None,
    tool_input: dict | None = None,
    tool_output: str | None = None,
) -> AgentStep:
    step = AgentStep(
        run_id=run_id,
        step_index=index,
        type=step_type,
        content=content,
        tool_name=tool_name,
        tool_input=tool_input,
        tool_output=tool_output,
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


def _resolve_model(db, user_id: UUID, model: str | None) -> tuple[str, bool]:
    """Return (model, use_router). Falls back to the single provider config."""
    use_router = has_enabled_providers(db, user_id)
    if model:
        return model, use_router
    if use_router:
        # router will use whatever model string we pass; try catalog/config default
        cfg = _safe_config_model(db, user_id)
        return cfg or "", use_router
    cfg = _safe_config_model(db, user_id)
    return cfg or "", use_router


def _safe_config_model(db, user_id: UUID) -> str | None:
    try:
        cfg = get_provider_config(db, user_id)
        return cfg.model or None
    except Exception:  # noqa: BLE001
        return None


async def _complete_once(db, user_id, model, messages, tools, use_router, preferred_provider_id):
    if use_router:
        message, _provider = await route_completion(
            db, user_id, model, messages, tools=tools, preferred_provider_id=preferred_provider_id
        )
        return message
    cfg = get_provider_config(db, user_id)
    return await chat_completion(
        base_url=cfg.base_url,
        api_key=cfg.api_key,
        model=model or cfg.model,
        messages=messages,
        tools=tools,
    )


async def _complete(db, user_id, model, messages, tools, use_router, preferred_provider_id):
    """One LLM completion with a single retry on transient upstream failures.

    Providers occasionally return transient 4xx/5xx (e.g. upstream routing hiccups);
    a single retry meaningfully improves sub-agent reliability without masking real errors."""
    try:
        return await _complete_once(db, user_id, model, messages, tools, use_router, preferred_provider_id)
    except Exception:  # noqa: BLE001
        await asyncio.sleep(0.6)
        return await _complete_once(db, user_id, model, messages, tools, use_router, preferred_provider_id)


async def run_agent(run_id: UUID, user_id: UUID):
    """Execute a run to completion, yielding SSE event dicts. The caller serialises them."""
    with SessionLocal() as db:
        run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.user_id == user_id).first()
        if not run:
            yield {"type": "error", "message": "Run not found"}
            return

        goal = run.goal
        model_pref = run.model
        provider_pref = str(run.provider_id) if run.provider_id else None
        conversation_id = run.conversation_id
        skill_id = run.skill_id
        agent_id = run.agent_id
        depth = 0
        # Determine depth from parent chain
        if run.parent_run_id:
            depth = 1

        try:
            # Resolve agent template + skill
            allow_subagents = False
            system_prompt = _base_system_prompt()
            allowed_tools = None
            project_id = None

            if agent_id:
                agent = db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == user_id).first()
                if agent:
                    allow_subagents = agent.allow_subagents
                    if agent.system_prompt:
                        system_prompt = agent.system_prompt
                    if not skill_id and agent.skill_id:
                        skill_id = agent.skill_id
                    if not model_pref and agent.model:
                        model_pref = agent.model

            if skill_id:
                from app.services.skill_service import get_skill
                try:
                    skill = get_skill(db, user_id, skill_id)
                    system_prompt = f"{system_prompt}\n\n## Skill: {skill.name}\n{skill.instructions}"
                    allowed_tools = skill.tool_names or None
                except Exception:  # noqa: BLE001
                    pass

            if conversation_id:
                from app.models.conversation import Conversation
                conv = (
                    db.query(Conversation)
                    .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
                    .first()
                )
                if conv:
                    project_id = conv.project_id
                else:
                    # conversation_id doesn't belong to this user — ignore it (no cross-user leakage)
                    conversation_id = None

            # depth gating for sub-agents
            if depth >= MAX_SUBAGENT_DEPTH:
                allow_subagents = False

            # Memory context
            mem_context = memory_service.build_memory_context(
                db, user_id, conversation_id=conversation_id, project_id=project_id
            )
            if mem_context:
                system_prompt = f"{system_prompt}\n\n{mem_context}"

            model, use_router = _resolve_model(db, user_id, model_pref)

            registry = agent_tools.build_registry(
                db, user_id, allow_subagents=allow_subagents, allowed_tool_names=allowed_tools
            )
            openai_tools = agent_tools.to_openai_tools(registry) if registry else None

            ctx = agent_tools.ToolContext(
                session_factory=SessionLocal,
                user_id=user_id,
                conversation_id=conversation_id,
                project_id=project_id,
                allow_subagents=allow_subagents,
                depth=depth,
            )
            if allow_subagents:
                ctx.spawn_fn = _make_spawn_fn(user_id, run_id, model_pref, provider_pref, conversation_id, depth)

            run.status = "running"
            db.commit()
            yield {"type": "status", "status": "running", "run_id": str(run_id)}

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": goal},
            ]

        except Exception as _setup_exc:  # noqa: BLE001
            _run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if _run:
                _run.status = "failed"
                _run.error = str(_setup_exc)
                _run.updated_at = datetime.utcnow()
                db.commit()
            yield {"type": "error", "message": str(_setup_exc)}
            return

        step_index = 0
        final_answer = None

        try:
            for iteration in range(MAX_ITERATIONS):
                message = await _complete(
                    db, user_id, model, messages, openai_tools, use_router, provider_pref
                )
                tool_calls = message.get("tool_calls") or []
                content = message.get("content")

                # Append assistant message to the running transcript
                assistant_msg = {"role": "assistant", "content": content or ""}
                if tool_calls:
                    assistant_msg["tool_calls"] = tool_calls
                messages.append(assistant_msg)

                if content and content.strip():
                    _record_step(db, run_id, step_index, "thought", content=content)
                    yield {"type": "thought", "content": content, "index": step_index}
                    step_index += 1

                if not tool_calls:
                    # No tool calls means the model produced its final answer.
                    if content and content.strip():
                        final_answer = content
                        break
                    # Empty content with no tool calls: nudge once for a real answer,
                    # then give up rather than recording a blank result.
                    if iteration < MAX_ITERATIONS - 1:
                        messages.append({
                            "role": "user",
                            "content": "Please provide your final answer now.",
                        })
                        continue
                    final_answer = "(the model returned an empty response)"
                    break

                # Execute tool calls (concurrently when there is more than one)
                async def _run_one(call):
                    fn = call.get("function", {})
                    name = fn.get("name", "")
                    raw_args = fn.get("arguments")
                    args = agent_tools.parse_tool_arguments(raw_args)
                    tool = registry.get(name)
                    if not tool:
                        return call, name, args, f"Error: unknown tool '{name}'"
                    try:
                        output = await tool.handler(ctx, args)
                    except Exception as exc:  # noqa: BLE001
                        output = f"Error running tool '{name}': {exc}"
                    return call, name, args, output

                for call in tool_calls:
                    fn = call.get("function", {})
                    name = fn.get("name", "")
                    args = agent_tools.parse_tool_arguments(fn.get("arguments"))
                    _record_step(db, run_id, step_index, "tool_call", tool_name=name, tool_input=args)
                    yield {"type": "tool_call", "tool": name, "input": args, "index": step_index}
                    step_index += 1

                results = await asyncio.gather(*[_run_one(c) for c in tool_calls])

                for call, name, args, output in results:
                    output_str = output if isinstance(output, str) else str(output)
                    _record_step(
                        db, run_id, step_index, "tool_result",
                        tool_name=name, tool_input=args, tool_output=output_str,
                    )
                    yield {"type": "tool_result", "tool": name, "output": output_str, "index": step_index}
                    step_index += 1
                    messages.append({
                        "role": "tool",
                        "tool_call_id": call.get("id", ""),
                        "name": name,
                        "content": output_str[:8000],
                    })
            else:
                # ran out of iterations without a final answer
                if final_answer is None:
                    final_answer = "(stopped: reached maximum number of steps)"

            run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            run.status = "completed"
            run.result = final_answer
            run.updated_at = datetime.utcnow()
            _record_step(db, run_id, step_index, "final", content=final_answer)
            db.commit()
            yield {"type": "final", "content": final_answer, "index": step_index}
            yield {"type": "done", "run_id": str(run_id)}

        except Exception as exc:  # noqa: BLE001
            run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if run:
                run.status = "failed"
                run.error = str(exc)
                run.updated_at = datetime.utcnow()
                _record_step(db, run_id, step_index, "error", content=str(exc))
                db.commit()
            yield {"type": "error", "message": str(exc)}


def _make_spawn_fn(parent_user_id, parent_run_id, model_pref, provider_pref, conversation_id, parent_depth):
    """Return an async spawn function that runs a sub-agent to completion and returns its result text."""
    async def spawn(role: str, goal: str) -> str:
        with SessionLocal() as db:
            sub = create_run(
                db,
                user_id=parent_user_id,
                goal=goal,
                model=model_pref,
                provider_id=UUID(provider_pref) if provider_pref else None,
                conversation_id=conversation_id,
                parent_run_id=parent_run_id,
                role=role,
            )
            sub_id = sub.id
        # Drain the sub-agent run; we only need its final result.
        final = ""
        async for evt in run_agent(sub_id, parent_user_id):
            if evt.get("type") == "final":
                final = evt.get("content", "")
            elif evt.get("type") == "error":
                final = f"[sub-agent error] {evt.get('message')}"
        return f"Sub-agent '{role}' result:\n{final}"

    return spawn


async def run_subagents_parallel(specs: list[tuple[str, str]], spawn_fn) -> list[str]:
    return await asyncio.gather(*[spawn_fn(role, goal) for role, goal in specs])
