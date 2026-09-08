import "../index.css";

export const metadata = {
  title: "ChurnDesk",
  description: "Intelligent incident routing and AI operations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
