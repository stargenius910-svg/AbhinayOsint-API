import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {admin}=await requireAdmin();
    const {id}=await params;
    const body=await req.json();
    const allowed:any={};
    for(const k of ["name","route","upstream_url","owner_label","request_limit","limit_period","enabled","transform"]) if(k in body) allowed[k]=body[k];
    const {error}=await admin.from("api_configs").update(allowed).eq("id",id);
    if(error) throw error;
    return NextResponse.json({ok:true});
  }catch(e:any){return NextResponse.json({error:"Forbidden or invalid request"},{status:400});}
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {admin}=await requireAdmin();
    const {id}=await params;
    const {error}=await admin.from("api_configs").delete().eq("id",id);
    if(error) throw error;
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"Forbidden"},{status:400});}
}