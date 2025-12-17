import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Providers } from "./providers";
import Script from "next/script";

export const metadata = {
  title: "Minesweeper Game - Classic Puzzle Game",
  description:
    "Play the classic Minesweeper game online. Test your logic and strategy skills with three difficulty levels.",
  keywords: "minesweeper, puzzle game, logic game, strategy game, online game",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
