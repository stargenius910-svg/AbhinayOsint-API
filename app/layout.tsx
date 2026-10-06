import "./globals.css";

export const metadata = {
  title: "Abhinay API Hub",
  description: "Private API management dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}