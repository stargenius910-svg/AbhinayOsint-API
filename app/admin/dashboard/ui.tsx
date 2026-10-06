 "use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Api = {
  id:string; name:string; route:string; public_id:string; upstream_url:string;
  enabled:boolean; request_limit:number|null; limit_period:string;
  requests_used:number; owner_label:string|null; transform: any;
};

export default function DashboardClient() {
  const [apis,setApis]=useState<Api[]>([]);
  const [form,setForm]=useState({name:"",route:"number",upstream_url:"",owner_label:"",request_limit:"1000",limit_period:"day"});
  const [msg,setMsg]=useState("");

  async function load(){ const r=await fetch("/api/admin/apis"); if(r.ok) setApis(await r.json()); }
  useEffect(()=>{load()},[]);

  async function createApi(e:any){
    e.preventDefault(); setMsg("");
    const r=await fetch("/api/admin/apis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      ...form, request_limit: form.request_limit ? Number(form.request_limit) : null,
      transform:{developer:"Abhinay",remove_fields:["youtube"],show_usage:true}
    })});
    const d=await r.json(); if(!r.ok) return setMsg(d.error||"Failed");
    setForm({...form,name:"",upstream_url:"",owner_label:""});
    setMsg(`Created: /api/${d.route}/${d.public_id}`);
    load();
  }

  async function toggle(id:string, enabled:boolean){
    await fetch(`/api/admin/apis/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:!enabled})});
    load();
  }

  async function remove(id:string){
    if(!confirm("Delete this API?")) return;
    await fetch(`/api/admin/apis/${id}`,{method:"DELETE"}); load();
  }

  return <main className="page">
    <div className="topbar"><div><h1>Abhinay API Hub</h1><div className="muted">Admin dashboard</div></div></div>

    <section className="card panel" style={{marginBottom:18}}>
      <h2>Create API</h2>
      <form className="form" onSubmit={createApi}>
        <input className="input" placeholder="API name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
        <input className="input" placeholder="Route, e.g. number" value={form.route} onChange={e=>setForm({...form,route:e.target.value.replace(/[^a-zA-Z0-9_-]/g,"")})} required />
        <input className="input" placeholder="Authorized upstream URL, use {number} for the input" value={form.upstream_url} onChange={e=>setForm({...form,upstream_url:e.target.value})} required />
        <input className="input" placeholder="Owner label (optional)" value={form.owner_label} onChange={e=>setForm({...form,owner_label:e.target.value})} />
        <div className="row">
          <input className="input" style={{flex:1}} type="number" min="1" placeholder="Request limit" value={form.request_limit} onChange={e=>setForm({...form,request_limit:e.target.value})} />
          <select className="input" style={{flex:1}} value={form.limit_period} onChange={e=>setForm({...form,limit_period:e.target.value})}>
            <option value="day">Per day</option><option value="month">Per month</option><option value="total">Total</option>
          </select>
        </div>
        <button className="button" type="submit">Generate API</button>
        {msg && <div className="ok">{msg}</div>}
      </form>
    </section>

    <section className="card panel">
      <h2>Generated APIs</h2>
      <div className="tablewrap"><table className="table"><thead><tr>
        <th>Name</th><th>Endpoint</th><th>Status</th><th>Usage</th><th>Owner</th><th>Actions</th>
      </tr></thead><tbody>
      {apis.map(a=><tr key={a.id}>
        <td>{a.name}</td>
        <td><code>/api/{a.route}/{a.public_id}?number=...</code></td>
        <td><span className={"status "+(a.enabled?"success":"danger")}>{a.enabled?"Active":"Disabled"}</span></td>
        <td>{a.requests_used} / {a.request_limit ?? "∞"}</td>
        <td>{a.owner_label || "—"}</td>
        <td><div className="row">
          <button className="button secondary small" onClick={()=>toggle(a.id,a.enabled)}>{a.enabled?"Disable":"Enable"}</button>
          <button className="button danger small" onClick={()=>remove(a.id)}>Delete</button>
        </div></td>
      </tr>)}
      </tbody></table></div>
    </section>
  </main>;
}