import { Brain } from "lucide-react";
import type { ModelInfo } from "../types/chat";

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({ models, selectedModel, onChange }: ModelSelectorProps) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
      <Brain size={18} className="hidden shrink-0 text-mint-300 sm:block" aria-hidden="true" />
      <span className="sr-only">Model</span>
      <select
        value={selectedModel}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 max-w-[48vw] rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-slate-100 outline-none transition focus:border-mint-300 focus:ring-2 focus:ring-mint-300/20 sm:max-w-xs"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </label>
  );
}
