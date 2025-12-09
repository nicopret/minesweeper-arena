import "bootstrap/dist/css/bootstrap.min.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Minesweeper Game - Classic Puzzle Game",
  description:
    "Play the classic Minesweeper game online. Test your logic and strategy skills with three difficulty levels.",
  keywords: "minesweeper, puzzle game, logic game, strategy game, online game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
