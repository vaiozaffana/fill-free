import express, { type Request, type Response } from 'express';
import { fill } from './runner';

type MappedData = Record<string, string>;

/**
 * Create and start the Express server that receives mapped data from the
 * browser extension and drives Playwright.
 */
export function startServer(port: number): void {
  const app = express();
  app.use(express.json());

  app.post('/fill', (req: Request, res: Response) => {
    const data = req.body as MappedData;

    fill(data)
      .then(() => {
        res.status(200).json({ ok: true });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ ok: false, error: message });
      });
  });

  app.listen(port);
}
