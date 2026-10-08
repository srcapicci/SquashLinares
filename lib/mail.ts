import nodemailer from "nodemailer";
import { database } from "./db";
export async function deliverMail(tournamentId: string) {
  const client = await database().connect();
  let sent = 0,
    failed = 0;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT m.*,u.email FROM app_mail m JOIN app_users u ON u.id=m.user_id WHERE m.tournament_id=$1 AND m.sent_at IS NULL ORDER BY m.id FOR UPDATE OF m SKIP LOCKED",
      [tournamentId],
    );
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "127.0.0.1",
      port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === "true",
      connectionTimeout: 5000,
      socketTimeout: 10000,
      ...(process.env.SMTP_USER
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          }
        : {}),
    });
    for (const row of rows) {
      try {
        await transporter.sendMail({
          from:
            process.env.SMTP_FROM || "Club de Squash Linares <club@localhost>",
          to: row.email,
          subject: row.subject,
          text: row.body,
        });
        await client.query(
          "UPDATE app_mail SET sent_at=now(),attempts=attempts+1 WHERE id=$1",
          [row.id],
        );
        sent++;
      } catch {
        await client.query(
          "UPDATE app_mail SET attempts=attempts+1 WHERE id=$1",
          [row.id],
        );
        failed++;
      }
    }
    await client.query("COMMIT");
    return { sent, failed };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
