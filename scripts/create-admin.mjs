import pg from "pg";
import { hashPassword } from "../lib/password.mjs";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
let {
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
  ADMIN_NAME: name,
} = process.env;
if (!email || !password) {
  if (!process.stdin.isTTY)
    throw new Error(
      "Usa una terminal interactiva o define ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD de forma segura. No hay credenciales predeterminadas.",
    );
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  try {
    name = name || (await rl.question("Nombre del administrador: "));
    email = email || (await rl.question("Correo: "));
    if (!password) {
      process.stdout.write(
        "Contraseña (mínimo 12 caracteres, entrada oculta): ",
      );
      muted = true;
      password = await rl.question("");
      muted = false;
      process.stdout.write("\n");
    }
  } finally {
    rl.close();
  }
}
if (
  !email ||
  !/^\S+@\S+\.\S+$/.test(email) ||
  !password ||
  password.length < 12 ||
  password.length > 128
)
  throw new Error(
    "Correo inválido o contraseña fuera del rango de 12 a 128 caracteres.",
  );
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(
    "INSERT INTO app_users(name,email,password_hash,role) VALUES ($1,$2,$3,'admin')",
    [
      name?.trim() || "Administración",
      email.trim().toLowerCase(),
      await hashPassword(password),
    ],
  );
  console.log("Administrador creado.");
} finally {
  await client.end();
}
