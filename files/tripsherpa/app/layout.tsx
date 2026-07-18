import "./globals.css";

export const metadata = {
  title: "TripSherpa",
  description: "Voice copilot for travel chaos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
