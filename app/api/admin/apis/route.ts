import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { randomPublicId } from "@/lib/token";

export async function GET() {
  try {
    const { admin } = await requireAdmin();
    const { data, error } = await admin.from("api_configs")
      .select("id,name,route,public_id,upstream_url,enabled,request_limit,limit_period,requests_used,owner_label,transform")
      .order("created_at",{ascending:false});
    if (error) throw error;
    return NextResponse.json(data);
  } catch(e:any) {
    return NextResponse.json({error:e.message==="UNAUTHENTICATED"?"Unauthorized":"Forbidden"},{status:401});
  }
}

export async function POST(req: Request) {
  try {
    const { admin } = await requireAdmin();
    const body = await req.json();
    if (!body.name || !body.route || !body.upstream_url) return NextResponse.json({error:"name, route and upstream_url are required"},{status:400});

    let publicId = randomPublicId();
    for (let i=0;i<5;i++) {
      const {data} = await admin.from("api_configs").select("id").eq("public_id",publicId).maybeSingle();
      if (!data) break;
      publicId = randomPublicId();
    }

    const {data,error} = await admin.from("api_configs").insert({
      name: body.name,
      route: body.route,
      public_id: publicId,
      upstream_url: body.upstream_url,
      owner_label: body.owner_label || null,
      request_limit: body.request_limit ?? null,
      limit_period: body.limit_period || "day",
      enabled: true,
      requests_used: 0,
      period_started_at: new Date().toISOString(),
      transform: body.transform || {developer:"Abhinay",remove_fields:["youtube"],show_usage:true},
      created_by: (await requireAdmin()).user.id
    }).select("id,name,route,public_id").single();
    if(error) throw error;
    return NextResponse.json(data,{status:201});
  } catch(e:any) {
    return NextResponse.json({error:e.message||"Failed"},{status:400});
  }
}