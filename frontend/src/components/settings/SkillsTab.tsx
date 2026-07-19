import { useState } from 'react';
import { Download, Plus, Trash2, Sparkles, Lock, Upload } from 'lucide-react';
import { useSkills } from '../../hooks/useSkills';

export function SkillsTab() {
  const { skills, add, remove, importPackage, exportPackage } = useSkills();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', instructions: '' });
  const [importing, setImporting] = useState(false);
  const [skillMd, setSkillMd] = useState('');

  const submit = async () => {
    if (!form.name.trim() || !form.instructions.trim()) return;
    await add({ name: form.name.trim(), description: form.description.trim() || undefined, instructions: form.instructions.trim() });
    setForm({ name: '', description: '', instructions: '' });
    setAdding(false);
  };

  const submitImport = async () => {
    if (!skillMd.trim()) return;
    await importPackage(skillMd);
    setSkillMd('');
    setImporting(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">Reusable instruction sets that shape how agents work. {skills.length} available.</p>
        <div className="flex gap-1.5"><button onClick={() => setImporting((v) => !v)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"><Upload size={12} /> Import</button><button onClick={() => setAdding((v) => !v)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"><Plus size={12} /> {adding ? 'Cancel' : 'New skill'}</button></div>
      </div>

      {adding && (
        <div className="space-y-2 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Skill name (e.g. SQL Expert)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short description (optional)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500" />
          <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Instructions: how should the agent behave when using this skill?"
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 resize-none" />
          <button onClick={submit} disabled={!form.name.trim() || !form.instructions.trim()}
            className="w-full py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            Create skill
          </button>
        </div>
      )}

      {importing && <div className="space-y-2 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700"><p className="text-xs text-zinc-500">Paste a portable <code>SKILL.md</code>. It is stored as instructions only; OpenAgent never runs uploaded code.</p><textarea value={skillMd} onChange={(e) => setSkillMd(e.target.value)} rows={6} placeholder={'---\nname: "My skill"\ndescription: "..."\n---\n\n# My skill\n\nInstructions…'} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-500 resize-none font-mono" /><button onClick={submitImport} disabled={!skillMd.trim()} className="w-full py-2 rounded-lg bg-white text-black text-xs font-medium disabled:opacity-50">Import safe skill</button></div>}

      <div className="space-y-1.5">
        {skills.map((s) => (
          <div key={s.id} className="group flex items-start gap-2.5 p-3 rounded-xl border border-zinc-700 bg-zinc-800/50">
            <Sparkles size={15} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-white">{s.name}</p>
                {s.is_builtin && <Lock size={10} className="text-zinc-500" />}
              </div>
              {s.description && <p className="text-xs text-zinc-500 mt-0.5">{s.description}</p>}
              <p className="text-xs text-zinc-600 mt-1 line-clamp-2 leading-snug">{s.instructions}</p>
            </div>
            {!s.is_builtin && (
              <div className="hidden group-hover:flex gap-1 flex-shrink-0"><button onClick={() => exportPackage(s.id, s.name)} title="Export SKILL.md" className="p-1 rounded hover:bg-zinc-600 text-zinc-500 hover:text-zinc-200"><Download size={13} /></button><button onClick={() => remove(s.id)} className="p-1 rounded hover:bg-zinc-600 text-zinc-500 hover:text-red-400"><Trash2 size={13} /></button></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
