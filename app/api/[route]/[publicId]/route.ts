import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin";

function resetIfNeeded(api:any) {
  const now=Date.now();
  const start=new Date(api.period_started_at).getTime();
  const period=api.limit_period;
  const ms=period==="month" ? 30*24*60*60*1000 : period==="day" ? 24*60*60*1000 : Infinity;
  return ms !== Infinity && now-start >= ms;
}

function setPath(url:string, number:string) {
  return url.replaceAll("{number}", encodeURIComponent(number));
}

function transformResponse(payload:any, transform:any, used:number, limit:number|null) {
  let out = payload && typeof payload === "object" ? JSON.parse(JSON.stringify(payload)) : payload;
  if (out && typeof out === "object" && !Array.isArray(out)) {
    if (transform?.remove_fields) for (const key of transform.remove_fields) delete out[key];
    if ("developer" in out || transform?.developer) out.developer = transform?.developer ?? "Abhinay";
    if (transform?.show_usage) {
      out.requests = { used, limit, remaining: limit === null ? null : Math.max(limit-used,0) };
    }
  }
  return out;
}

export async function GET(req:Request,{params}:{params:Promise<{route:string;publicId:string}>}) {
  return handle(req,await params);
}
export async function POST(req:Request,{params}:{params:Promise<{route:string;publicId:string}>}) {
  return handle(req,await params);
}

async function handle(req:Request, p:{route:string;publicId:string}) {
  const db=serviceClient();
  const {data:api,error}=await db.from("api_configs").select("*").eq("public_id",p.publicId).eq("route",p.route).maybeSingle();
  if(error || !api) return NextResponse.json({error:"API not found"},{status:404});
  if(!api.enabled) return NextResponse.json({error:"API disabled"},{status:403});

  let used=api.requests_used||0;
  if(resetIfNeeded(api)) {
    used=0;
    await db.from("api_configs").update({requests_used:0,period_started_at:new Date().toISOString()}).eq("id",api.id);
  }
  if(api.request_limit !== null && used >= api.request_limit) {
    return NextResponse.json({error:"Request limit exceeded",limit:api.request_limit,used},{status:429});
  }

  const incoming=new URL(req.url);
  const number=incoming.searchParams.get("number");
  if(!number) return NextResponse.json({error:"Missing number parameter"},{status:400});

  // Only server-side configured upstream URLs are used. The example is a generic
  // template for authorized/test APIs; do not expose sensitive personal data.
  const target=setPath(api.upstream_url,number);
  const upstream=await fetch(target,{method:req.method,headers:{"Accept":"application/json"},cache:"no-store"});
  const text=await upstream.text();
  let body:any;
  try{body=JSON.parse(text)}catch{body={raw:text}}

  const newUsed=used+1;
  await db.from("api_configs").update({requests_used:newUsed}).eq("id",api.id);
  const output=transformResponse(body,api.transform,newUsed,api.request_limit);
  return NextResponse.json(output,{status:upstream.status});
}