import Link from "next/link";

export default function Home() {
  return (
    <main className="center">
      <section className="card hero">
        <div className="badge">ABHINAY API HUB</div>
        <h1>Manage your APIs from one place.</h1>
        <p>Create unique endpoints, set limits, enable/disable APIs, and configure safe response transformations.</p>
        <Link className="button" href="/admin/login">Admin Login</Link>
      </section>
    </main>
  );
}