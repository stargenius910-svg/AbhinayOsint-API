 "use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    router.push("/admin/dashboard");
    router.refresh();
  }

  return <main className="center"><form className="card panel form" style={{width:380}} onSubmit={submit}>
    <h2>Admin Login</h2>
    <input className="input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
    <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
    {error && <div className="error">{error}</div>}
    <button className="button" type="submit">Login</button>
  </form></main>;
}