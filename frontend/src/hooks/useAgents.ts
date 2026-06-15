import { useState, useCallback, useEffect, useRef } from 'react';
import {
  listAgents, listRuns, getRun, runAgent as apiRunAgent, deleteRun, clearRuns,
  Agent, AgentRun, AgentStep, RunEvent, RunAgentParams,
} from '../services/agents';

export interface LiveStep {
  type: AgentStep['type'];
  content?: string;
  tool?: string;
  input?: any;
  output?: string;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadAgents = useCallback(async () => {
    try { setAgents(await listAgents()); } catch { /* ignore */ }
  }, []);

  const loadRuns = useCallback(async () => {
    try { setRuns(await listRuns()); } catch { /* ignore */ }
  }, []);

  const start = useCallback((params: RunAgentParams) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsRunning(true);
    setRunError(null);
    setFinalAnswer(null);
    setLiveSteps([]);

    const controller = apiRunAgent(
      params,
      token,
      (evt: RunEvent) => {
        if (evt.type === 'thought') {
          setLiveSteps((p) => [...p, { type: 'thought', content: evt.content }]);
        } else if (evt.type === 'tool_call') {
          setLiveSteps((p) => [...p, { type: 'tool_call', tool: evt.tool, input: evt.input }]);
        } else if (evt.type === 'tool_result') {
          setLiveSteps((p) => [...p, { type: 'tool_result', tool: evt.tool, output: evt.output }]);
        } else if (evt.type === 'final') {
          setFinalAnswer(evt.content ?? '');
          setLiveSteps((p) => [...p, { type: 'final', content: evt.content }]);
        }
      },
      () => {
        setIsRunning(false);
        loadRuns();
      },
      (err) => {
        setIsRunning(false);
        setRunError(err);
      },
    );
    abortRef.current = controller;
  }, [loadRuns]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const removeRun = useCallback(async (id: string) => {
    setRuns((p) => p.filter((r) => r.id !== id));
    try { await deleteRun(id); } catch { loadRuns(); }
  }, [loadRuns]);

  const clearAllRuns = useCallback(async () => {
    setRuns([]);
    try { await clearRuns(); } catch { loadRuns(); }
  }, [loadRuns]);

  useEffect(() => {
    loadAgents();
    loadRuns();
  }, [loadAgents, loadRuns]);

  return {
    agents, runs, liveSteps, isRunning, runError, finalAnswer,
    loadAgents, loadRuns, start, stop, getRun, removeRun, clearAllRuns,
  };
}
