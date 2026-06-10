import { expect, test } from "@playwright/test";

test("dois jogadores entram e a liderança offline é transferida", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto("/");
  await host.getByLabel("Qual é o teu nome?").fill("Ana");
  await host.getByRole("button", { name: "Criar uma sala" }).click();
  await expect(host).toHaveURL(/\/sala\/[A-Z0-9]{5}$/);
  const code = host.url().split("/").at(-1)!;

  await guest.goto(`/sala/${code}`);
  await guest.getByLabel("O teu nome").fill("Beto");
  await guest.getByRole("button", { name: "Entrar na sala" }).click();
  await expect(guest).toHaveURL(new RegExp(`/sala/${code}$`));
  await expect(host.getByText("Beto", { exact: true })).toBeVisible();

  const session = await host.evaluate((roomCode) => {
    return JSON.parse(
      sessionStorage.getItem(`stop.ao:player:${roomCode}`)!,
    ) as { id: string; token: string };
  }, code);
  await host.evaluate(
    async ({ roomCode, actor }) => {
      await fetch(`/api/rooms/${roomCode}/presence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actor, online: false }),
      });
    },
    { roomCode: code, actor: session },
  );

  await expect(guest.getByText("Tu decides", { exact: true })).toBeVisible();
  await guest.getByRole("button", { name: "Preparar primeira rodada" }).click();
  await expect(
    guest.getByRole("heading", { name: "O comando é teu." }),
  ).toBeVisible();
  await guest.getByRole("button", { name: /^A/ }).click();

  await expect(guest.getByText("Gritar STOP")).toBeVisible();
  await expect(
    host.getByRole("heading", { name: "Preenche tudo antes do STOP." }),
  ).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});
