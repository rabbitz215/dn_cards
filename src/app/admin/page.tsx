"use client";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured, MonsterCard } from "@/lib/supabase";

const STAT_OPTIONS = ["Str","Agi","Int","Vit","Attk Power","Magic Attk","Defense","Magic Def","Crit","Crit Resist","Stun","Stun Resist","Paralyze","Para Resist","Max HP","Max MP","MP Recovery","Final Damage","Crystal of Power"];
const NEST_OPTIONS = ["Minotaur Nest","Cerberus Nest","Manticore Nest","Apocalypse Nest","Sea Dragon Nest","Archbishop Nest","Gigantes Nest","Green Dragon Nest","Professor K Nest","Chaos Resting Place","Typhoon Kim Nest","Desert Dragon Nest","Black Dragon Nest","New Nest"];

export default function Admin() {
  const [cards, setCards] = useState<MonsterCard[]>([]);
  const [editing, setEditing] = useState<MonsterCard | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [pwd, setPwd] = useState("");
  const [authed, setAuthed] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{ if(isSupabaseConfigured()) fetchFromSupa(); },[]);

  async function fetchFromSupa(){
    if(!supabase) return;
    const { data: cs } = await supabase.from("monster_cards").select("card_no,name,nests(name)").order("card_no");
    const { data: sts } = await supabase.from("card_stats").select("*").order("card_no");
    if(!cs || !sts) return;
    const map: Record<number, any> = {};
    cs.forEach((c:any)=>{ map[c.card_no]={card_no:c.card_no,name:c.name,nest:c.nests?.name||"Unknown",stats:{}}; });
    sts.forEach((s:any)=>{ if(!map[s.card_no]) return; if(!map[s.card_no].stats[s.stat_name]) map[s.card_no].stats[s.stat_name]=[0,0,0,0,0]; map[s.card_no].stats[s.stat_name][s.rarity-1]=s.value; });
    const conv: MonsterCard[] = Object.values(map).map((c:any)=>({card_no:c.card_no,name:c.name,nest:c.nest,stats:Object.entries(c.stats).map(([stat,values])=>({stat,values:values as number[]}))}));
    setCards(conv);
  }

  function startEdit(c: MonsterCard){ setEditing(JSON.parse(JSON.stringify(c))); setIsNew(false); }
  function startNew(){
    const maxNo = Math.max(...cards.map(c=>c.card_no),0);
    setEditing({card_no: maxNo+1, name:"", nest:"Minotaur Nest", stats:[{stat:"Crystal of Power", values:[0,0,0,0,0]}]});
    setIsNew(true);
  }

  function updateStat(idx:number, field:"stat"|number, val:any){
    if(!editing) return;
    const copy = {...editing, stats:[...editing.stats]};
    if(field==="stat") copy.stats[idx].stat=val;
    else copy.stats[idx].values[field as number]=parseInt(val)||0;
    setEditing(copy);
  }
  function addStat(){ if(!editing) return; setEditing({...editing, stats:[...editing.stats, {stat:"Str", values:[0,0,0,0,0]}]}); }
  function rmStat(idx:number){ if(!editing) return; setEditing({...editing, stats:editing.stats.filter((_,i)=>i!==idx)}); }

  async function save(){
    if(!editing || !supabase) return;
    if(!editing.name.trim()){ setMsg("Name required"); return; }
    
    // upsert nest
    await supabase.from("nests").upsert({name: editing.nest}, {onConflict:"name"});
    const { data: nestRow } = await supabase.from("nests").select("id").eq("name", editing.nest).single();
    if(!nestRow){ setMsg("Nest insert fail"); return; }
    
    const { error: e1 } = await supabase.from("monster_cards").upsert({card_no:editing.card_no, name:editing.name, nest_id:nestRow.id}, {onConflict:"card_no"});
    if(e1){ setMsg("Card save fail: "+e1.message); return; }
    
    await supabase.from("card_stats").delete().eq("card_no", editing.card_no);
    const rows = editing.stats.flatMap(s=> s.values.map((v,i)=>({card_no:editing.card_no, stat_name:s.stat, rarity:i+1, value:v})));
    const { error: e2 } = await supabase.from("card_stats").insert(rows);
    if(e2){ setMsg("Stats save fail: "+e2.message); return; }
    
    setMsg("Saved to Supabase!");
    fetchFromSupa();
    setEditing(null);
  }

  async function del(card_no:number){
    if(!confirm("Delete card #"+card_no+"?") || !supabase) return;
    await supabase.from("card_stats").delete().eq("card_no", card_no);
    await supabase.from("monster_cards").delete().eq("card_no", card_no);
    setMsg("Deleted from Supabase");
    fetchFromSupa();
  }

  if(!isSupabaseConfigured()){
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0e14]">
        <div className="w-full max-w-sm bg-[#151a23] border border-[#232a38] rounded-2xl p-6 text-center">
          <h1 className="font-bold text-red-400">Database connection missing</h1>
          <p className="text-xs text-zinc-400 mt-2">Set env variables in `.env.local` to access admin panel.</p>
        </div>
      </div>
    );
  }

  if(!authed){
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0e14]">
        <div className="w-full max-w-sm bg-[#151a23] border border-[#232a38] rounded-2xl p-6">
          <h1 className="font-bold text-lg">Admin Login</h1>
          <p className="text-xs text-zinc-400 mt-1">Enter admin password.</p>
          <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Password" className="w-full mt-4 bg-[#0b0e14] border border-[#232a38] rounded-xl px-4 py-2.5 text-sm"/>
          <button onClick={()=>{ const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123"; if(pwd===expected) setAuthed(true); else alert("wrong"); }} className="w-full mt-3 bg-[#f5c15e] text-black font-bold py-2.5 rounded-xl text-sm">Enter</button>
          <a href="/" className="block text-center text-xs text-zinc-500 mt-3">← Back to DB</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-[#232a38] bg-[#0b0e14]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3"><a href="/" className="text-xs border border-[#232a38] rounded-lg px-2 py-1">← DB</a><h1 className="font-bold">Admin • {cards.length} cards</h1></div>
          <div className="flex gap-2"><button onClick={startNew} className="text-xs px-3 py-2 rounded-lg bg-[#f5c15e] text-black font-bold">+ New Card</button></div>
        </div>
      </header>

      {msg && <div className="max-w-6xl mx-auto px-4 mt-3"><div className="bg-[#f5c15e]/10 border border-[#f5c15e]/30 text-[#f5c15e] text-xs px-3 py-2 rounded-xl">{msg}</div></div>}

      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-5 lg:col-span-4 bg-[#151a23] border border-[#232a38] rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-[#232a38] text-[11px] font-bold tracking-widest text-zinc-400 uppercase">All Cards</div>
          <div className="max-h-[80vh] overflow-auto">
            {cards.sort((a,b)=>a.card_no-b.card_no).map(c=>(
              <div key={c.card_no} className={`flex items-center justify-between px-3 py-2 hover:bg-[#0b0e14] border-b border-[#232a38]/50 ${editing?.card_no===c.card_no?'bg-[#0b0e14]':''}`}>
                <button onClick={()=>startEdit(c)} className="text-left flex-1 min-w-0"><span className="text-[10px] font-mono text-zinc-500">#{String(c.card_no).padStart(2,'0')}</span><p className="text-[12px] font-bold truncate">{c.name}</p><p className="text-[10px] text-zinc-500">{c.nest}</p></button>
                <button onClick={()=>del(c.card_no)} className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 ml-2">DEL</button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-7 lg:col-span-8">
          {!editing ? <div className="bg-[#151a23] border border-dashed border-[#232a38] rounded-2xl p-10 text-center text-zinc-500 text-sm">Select a card to edit or create new</div> :
          <div className="bg-[#151a23] border border-[#232a38] rounded-2xl p-5">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[10px] uppercase font-bold text-zinc-400">Card No</label><input type="number" value={editing.card_no} onChange={e=>setEditing({...editing, card_no:parseInt(e.target.value)||0})} className="w-full mt-1 bg-[#0b0e14] border border-[#232a38] rounded-xl px-3 py-2 text-sm"/></div>
              <div className="col-span-2"><label className="text-[10px] uppercase font-bold text-zinc-400">Name</label><input value={editing.name} onChange={e=>setEditing({...editing, name:e.target.value})} className="w-full mt-1 bg-[#0b0e14] border border-[#232a38] rounded-xl px-3 py-2 text-sm"/></div>
            </div>
            <div className="mt-3"><label className="text-[10px] uppercase font-bold text-zinc-400">Nest</label><select value={editing.nest} onChange={e=>setEditing({...editing, nest:e.target.value})} className="w-full mt-1 bg-[#0b0e14] border border-[#232a38] rounded-xl px-3 py-2 text-sm">{NEST_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}</select><input value={editing.nest} onChange={e=>setEditing({...editing, nest:e.target.value})} placeholder="Or custom nest" className="w-full mt-2 bg-[#0b0e14] border border-[#232a38] rounded-xl px-3 py-2 text-xs text-zinc-400"/></div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2"><p className="text-[11px] font-bold tracking-widest uppercase">Stats / Values per Rarity (Magic,Rare,Epic,Unique,Legend)</p><button onClick={addStat} className="text-[11px] px-2 py-1 rounded-lg bg-[#0b0e14] border border-[#232a38]">+ Stat</button></div>
              <div className="space-y-2">
                {editing.stats.map((s,idx)=>(
                  <div key={idx} className="bg-[#0b0e14] border border-[#232a38] rounded-xl p-3 flex gap-2 items-start">
                    <select value={s.stat} onChange={e=>updateStat(idx,"stat",e.target.value)} className="bg-[#151a23] border border-[#232a38] rounded-lg px-2 py-1.5 text-xs w-[150px]">{STAT_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}<option value={s.stat}>{s.stat} (custom)</option></select>
                    <input value={s.stat} onChange={e=>updateStat(idx,"stat",e.target.value)} className="bg-[#151a23] border border-[#232a38] rounded-lg px-2 py-1.5 text-xs w-[120px] hidden md:block" placeholder="custom"/>
                    <div className="flex gap-1 flex-1">
                      {[0,1,2,3,4].map(r=><input key={r} type="number" value={s.values[r]} onChange={e=>updateStat(idx,r,e.target.value)} className="w-full bg-[#151a23] border border-[#232a38] rounded-lg px-1 py-1.5 text-xs font-mono text-center"/>)}
                    </div>
                    <button onClick={()=>rmStat(idx)} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={save} className="flex-1 bg-[#f5c15e] text-black font-bold py-2.5 rounded-xl text-sm">{isNew?"Create":"Save"}</button>
              <button onClick={()=>setEditing(null)} className="px-4 py-2.5 rounded-xl bg-[#0b0e14] border border-[#232a38] text-sm">Cancel</button>
            </div>
          </div>
          }
        </div>
      </div>
    </div>
  );
}
