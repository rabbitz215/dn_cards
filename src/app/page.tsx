"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured, MonsterCard } from "@/lib/supabase";

const RARITY = [
  { id: 1, name: "Magic", short: "M", color: "#22c55e", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  { id: 2, name: "Rare", short: "R", color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  { id: 3, name: "Epic", short: "E", color: "#f97316", bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" },
  { id: 4, name: "Unique", short: "U", color: "#a855f7", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  { id: 5, name: "Legend", short: "L", color: "#f43f5e", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" },
];

function nestAccent(nest: string) {
  const map: Record<string,string> = {
    "Minotaur Nest": "from-zinc-500 to-zinc-700",
    "Cerberus Nest": "from-red-500 to-orange-500",
    "Apocalypse Nest": "from-violet-500 to-fuchsia-500",
    "Sea Dragon Nest": "from-cyan-400 to-blue-600",
    "Archbishop Nest": "from-amber-400 to-yellow-600",
    "Gigantes Nest": "from-stone-400 to-stone-600",
    "Green Dragon Nest": "from-emerald-400 to-green-600",
    "Professor K Nest": "from-pink-400 to-rose-600",
    "Chaos Resting Place": "from-zinc-600 to-zinc-800",
    "Typhoon Kim Nest": "from-sky-400 to-indigo-600",
    "Desert Dragon Nest": "from-orange-300 to-amber-600",
  };
  return map[nest] || "from-zinc-500 to-zinc-700";
}

export default function Home() {
  const [cards, setCards] = useState<MonsterCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<Set<number>>(new Set([1,2,3,4,5]));
  const [statFilter, setStatFilter] = useState<Set<string>>(new Set());
  const [nestFilter, setNestFilter] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState("card_no");
  const [selected, setSelected] = useState<MonsterCard | null>(null);

  useEffect(() => {
    async function fetchSupa() {
      if (!isSupabaseConfigured() || !supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data: cs, error } = await supabase
          .from("monster_cards")
          .select("card_no, name, nests(name), card_stats(stat_name, rarity, value)")
          .order("card_no");
        if (error || !cs?.length) {
          setLoading(false);
          return;
        }
        const converted: MonsterCard[] = cs.map((c: any) => {
          const statsMap: Record<string, number[]> = {};
          c.card_stats?.forEach((s: any) => {
            if (!statsMap[s.stat_name]) statsMap[s.stat_name] = [0, 0, 0, 0, 0];
            statsMap[s.stat_name][s.rarity - 1] = s.value;
          });
          return {
            card_no: c.card_no,
            name: c.name,
            nest: c.nests?.name || "Unknown",
            stats: Object.entries(statsMap).map(([stat, values]) => ({
              stat,
              values,
            })),
          };
        });
        setCards(converted);
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchSupa();
  }, []);

  const allStats = useMemo(() => [...new Set(cards.flatMap(c=>c.stats.map(s=>s.stat)))].sort(), [cards]);
  const allNests = useMemo(() => [...new Set(cards.map(c=>c.nest))].sort(), [cards]);

  const filtered = useMemo(() => {
    let f = cards.filter(c => {
      if (q && !(`${c.name} ${c.nest} ${c.card_no}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (nestFilter.size && !nestFilter.has(c.nest)) return false;
      if (statFilter.size && !c.stats.some(s=>statFilter.has(s.stat))) return false;
      return true;
    });
    if (sort === "name") f = [...f].sort((a,b)=>a.name.localeCompare(b.name));
    else if (sort === "card_no") f = [...f].sort((a,b)=>a.card_no-b.card_no);
    else if (sort === "card_no_desc") f = [...f].sort((a,b)=>b.card_no-a.card_no);
    else if (sort === "power") f = [...f].sort((a,b)=>{
      const sum = (x:MonsterCard)=> x.stats.filter(s=>s.stat!=="Crystal of Power").reduce((acc,s)=>acc+Math.max(...s.values.filter((_,i)=>rarity.has(i+1))),0);
      return sum(b)-sum(a);
    });
    return f;
  }, [cards, q, nestFilter, statFilter, sort, rarity]);

  const totalStats = useMemo(() => {
    const totals: Record<string, number[]> = {};
    filtered.forEach(c => {
      c.stats.forEach(s => {
        if (s.stat === "Crystal of Power") return;
        if (!totals[s.stat]) totals[s.stat] = [0, 0, 0, 0, 0];
        s.values.forEach((v, i) => {
          if (rarity.has(i + 1)) {
            totals[s.stat][i] += v;
          }
        });
      });
    });
    return Object.entries(totals).sort((a, b) => b[1].reduce((sum, v) => sum + v, 0) - a[1].reduce((sum, v) => sum + v, 0));
  }, [filtered, rarity]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0b0e14]">
        <div className="max-w-md w-full bg-[#151a23] border border-[#232a38] p-6 rounded-2xl text-center">
          <h2 className="text-lg font-bold text-red-400">Database connection missing</h2>
          <p className="text-xs text-zinc-400 mt-2">Create `.env.local` with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to load cards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0b0e14]/90 border-b border-[#232a38]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#f5c15e] to-orange-500 flex items-center justify-center font-black text-black text-sm">DN</div>
            <div><h1 className="font-extrabold leading-none tracking-tight text-sm">MONSTER CARD <span className="text-[#f5c15e]">DB</span></h1><p className="text-[10px] tracking-[0.2em] text-zinc-400 font-bold uppercase">Classic SEA • {cards.length} Cards</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full bg-[#151a23] border border-[#232a38]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span>Supabase active</span>
            </div>
            <a href="/admin" className="text-xs font-bold px-3 py-2 rounded-lg bg-[#f5c15e] text-black hover:brightness-110">Admin</a>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center text-sm font-semibold text-zinc-400">Loading cards from Supabase...</div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-5 grid grid-cols-12 gap-4 md:gap-5">
          <aside className="col-span-12 lg:col-span-3 space-y-4 lg:sticky lg:top-[84px] h-fit">
            <div className="bg-[#151a23] border border-[#232a38] rounded-2xl p-4">
              <div className="relative">
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search monster..." className="w-full bg-[#0b0e14] border border-[#232a38] rounded-xl px-4 py-2.5 pl-9 text-sm outline-none focus:border-[#f5c15e]/50"/>
                <span className="absolute left-3 top-3 text-zinc-500 text-sm">⌕</span>
              </div>

              <div className="mt-4"><p className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase mb-2">Rarity</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {RARITY.map(r=>{
                    const active = rarity.has(r.id);
                    return <button key={r.id} onClick={()=>{ const n=new Set(rarity); if(active) n.delete(r.id); else n.add(r.id); setRarity(n); }} className={`rounded-xl py-2 text-[11px] font-bold border transition ${active?`${r.bg} ${r.border} ring-2`:'opacity-30 border-[#232a38]'} `} style={{boxShadow:active?`0 0 0 1px ${r.color}40`:''}}>{r.short}</button>
                  })}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between"><p className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Stat Filter</p><button onClick={()=>setStatFilter(new Set())} className="text-[10px] text-zinc-500 hover:text-white">Clear</button></div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {allStats.map(st=>{
                    const a = statFilter.has(st);
                    return <button key={st} onClick={()=>{ const n=new Set(statFilter); if(a) n.delete(st); else n.add(st); setStatFilter(n); }} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${a?'bg-[#f5c15e] text-black border-[#f5c15e]':'bg-[#0b0e14] border-[#232a38] hover:border-zinc-500'}`}>{st}</button>
                  })}
                </div>
              </div>

              <div className="mt-4"><p className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase mb-2">Nest</p>
                <div className="space-y-1 max-h-[260px] overflow-auto pr-1">
                  {allNests.map(n=>{
                    const cnt = cards.filter(c=>c.nest===n).length;
                    const checked = nestFilter.has(n);
                    return <label key={n} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#0b0e14] cursor-pointer text-[12px]"><span className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={e=>{ const nn=new Set(nestFilter); if(e.target.checked) nn.add(n); else nn.delete(n); setNestFilter(nn); }} className="accent-[#f5c15e]"/> {n}</span><span className="text-[10px] text-zinc-500">{cnt}</span></label>
                  })}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#232a38] flex items-center justify-between text-[11px] text-zinc-400">
                <span>{filtered.length} cards</span>
                <select value={sort} onChange={e=>setSort(e.target.value)} className="bg-[#0b0e14] border border-[#232a38] rounded-lg px-2 py-1 text-xs">
                  <option value="card_no">No Asc</option><option value="card_no_desc">No Desc</option><option value="name">Name A-Z</option><option value="power">Max Power</option>
                </select>
              </div>
            </div>
          </aside>

          <main className="col-span-12 lg:col-span-9">
            <div className="flex items-center gap-2 mb-3 text-[11px] flex-wrap">
              {RARITY.map(r=><span key={r.id} className="px-2.5 py-1 rounded-full bg-[#151a23] border border-[#232a38]">{r.short} {r.name}={r.id}</span>)}
            </div>

            {totalStats.length > 0 && (
              <div className="bg-[#151a23] border border-[#232a38] rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-extrabold tracking-widest text-[#f5c15e] uppercase">Total Stats Sum (Active Filters)</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Sums from {filtered.length} visible cards</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {totalStats.map(([stat, values]) => (
                    <div key={stat} className="bg-[#0b0e14]/50 border border-[#232a38]/80 rounded-xl p-2.5 flex flex-col justify-between gap-1">
                      <span className="text-[11.5px] font-bold text-zinc-300 truncate">{stat}</span>
                      <div className="flex gap-1 mt-0.5">
                        {values.map((v, i) => {
                          const r = RARITY[i];
                          if (!rarity.has(r.id)) return null;
                          return (
                            <span key={i} className={`flex-1 text-center px-1 py-0.5 rounded text-[10px] font-mono font-bold ${r.bg} ${r.text} border ${r.border}`} title={r.name}>
                              {v}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="bg-[#151a23] border border-[#232a38] rounded-2xl p-10 text-center text-zinc-500 text-sm">No cards found matching filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(card=>(
                  <div key={card.card_no} onClick={()=>setSelected(card)} className="group relative bg-[#151a23] border border-[#232a38] rounded-2xl p-3.5 hover:border-zinc-600 transition cursor-pointer">
                    <div className={`absolute top-0 left-3 right-3 h-[2px] bg-gradient-to-r ${nestAccent(card.nest)}`}></div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0b0e14] border border-[#232a38]">#{String(card.card_no).padStart(2,'0')}</span><span className="text-[10px] tracking-widest uppercase text-zinc-500 font-bold truncate">{card.nest}</span></div>
                        <h3 className="font-extrabold text-[13.5px] mt-1 leading-tight truncate">{card.name}</h3>
                      </div>
                      <div className="flex -space-x-1">
                        {RARITY.map(r=><div key={r.id} className="w-3 h-3 rounded-full border-2 border-[#151a23]" style={{background:r.color, opacity: rarity.has(r.id)?1:0.25}}></div>)}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {(statFilter.size? card.stats.filter(s=>statFilter.has(s.stat)): card.stats.slice(0,4)).map(s=>(
                        <div key={s.stat} className={`flex items-center justify-between text-[11px] ${s.stat==='Crystal of Power'?'opacity-60':''}`}>
                          <span className="text-zinc-400 font-semibold truncate mr-2">{s.stat}</span>
                          <span className="flex gap-1 font-mono text-[11px] shrink-0">
                            {s.values.map((v,i)=>{ const r=RARITY[i]; return <span key={i} className={`px-1 rounded ${rarity.has(r.id)?'':'opacity-20'} ${r.bg} ${r.text} border ${r.border}`}>{v}</span> })}
                          </span>
                        </div>
                      ))}
                      {!statFilter.size && card.stats.length>4 && <div className="text-[10px] text-zinc-500 font-bold">+{card.stats.length-4} more →</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-auto" onClick={()=>setSelected(null)}>
          <div className="max-w-4xl mx-auto mt-10 bg-[#151a23] border border-[#232a38] rounded-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="p-5 flex items-start justify-between border-b border-[#232a38]">
              <div><div className="flex items-center gap-3"><span className="text-xs font-mono px-2 py-1 rounded bg-[#0b0e14] border border-[#232a38]">#{String(selected.card_no).padStart(2,'0')}</span><span className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">{selected.nest}</span></div><h2 className="text-2xl font-extrabold mt-2">{selected.name}</h2></div>
              <button onClick={()=>setSelected(null)} className="w-8 h-8 rounded-lg bg-[#0b0e14] border border-[#232a38]">✕</button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-5 gap-2 mb-5">
                {RARITY.map(r=><div key={r.id} className={`rounded-xl border ${r.border} ${r.bg} p-2.5 text-center`}><div className="w-2 h-2 rounded-full mx-auto mb-1" style={{background:r.color}}></div><p className={`text-[10px] font-bold tracking-widest ${r.text}`}>{r.name}</p><p className="text-[10px] text-zinc-500">Rarity {r.id}</p></div>)}
              </div>
              <div className="overflow-auto border border-[#232a38] rounded-xl">
                <table className="w-full text-[12px]"><thead><tr className="bg-[#0b0e14] text-[10px] tracking-widest uppercase text-zinc-500"><th className="text-left p-2.5 font-bold">Stat</th>{RARITY.map(r=><th key={r.id} className="p-2.5 text-center"><span className={`px-2 py-1 rounded-full ${r.bg} ${r.text} border ${r.border}`}>{r.short}</span></th>)}</tr></thead><tbody>{selected.stats.map(s=><tr key={s.stat} className={`border-t border-[#232a38] ${s.stat==='Crystal of Power'?'bg-amber-500/5':''}`}><td className={`p-2.5 font-bold ${s.stat==='Crystal of Power'?'text-amber-400':''}`}>{s.stat}</td>{s.values.map((v,i)=><td key={i} className="p-2.5 text-center font-mono font-bold">{v}</td>)}</tr>)}</tbody></table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
