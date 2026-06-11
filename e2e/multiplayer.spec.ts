import { expect, test } from "@playwright/test";

test("dois jogadores entram e completam uma rodada sincronizada", async ({
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

  await expect(host.getByText("Tu decides", { exact: true })).toBeVisible();
  await host.getByRole("button", { name: "Preparar primeira rodada" }).click();
  await expect(
    host.getByRole("heading", { name: "O comando é teu." }),
  ).toBeVisible();
  await host.getByRole("button", { name: /^A/ }).click();

  await expect(
    guest.getByRole("button", { name: "Preenche tudo para gritar STOP" }),
  ).toBeVisible();
  await expect(
    host.getByRole("heading", { name: "Preenche tudo antes do STOP." }),
  ).toBeVisible();
  await expect(
    host.getByRole("button", { name: "Preenche tudo para gritar STOP" }),
  ).toBeVisible();

  const answers = ["Ana", "Angola", "Arroz", "Actor", "Antílope"];
  const answerInputs = host.getByPlaceholder("A...");
  await expect(answerInputs).toHaveCount(answers.length);
  for (const [index, answer] of answers.entries()) {
    await answerInputs.nth(index).fill(answer);
  }

  await host.getByRole("button", { name: "Gritar STOP" }).click();
  await expect(guest.getByText("Ana gritou STOP primeiro.")).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});

test("permite alternar e persistir o idioma da interface", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Idioma").selectOption("en");
  await expect(page.getByRole("heading", { name: /Think fast/ })).toBeVisible();

  await page.getByLabel("Language").selectOption("fr");
  await expect(page.getByRole("heading", { name: /Pense vite/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /Pense vite/ })).toBeVisible();

  await page.getByLabel("Langue").selectOption("pt");
  await expect(page.getByRole("heading", { name: /Pensa rápido/ })).toBeVisible();
});

test("recupera a partida após fechar e reabrir o navegador", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/");
  await page.getByLabel("Qual é o teu nome?").fill("Dina");
  await page.getByRole("button", { name: "Criar uma sala" }).click();
  await expect(page).toHaveURL(/\/sala\/[A-Z0-9]{5}$/);
  const code = page.url().split("/").at(-1)!;

  await expect(page.getByText("Tu decides", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toContain(
    `stop.ao:player:${code}`,
  );

  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(`/sala/${code}`);
  await expect(reopened.getByText("Tu decides", { exact: true })).toBeVisible();
  await expect(reopened.getByLabel("O teu nome")).toHaveCount(0);

  await context.setOffline(true);
  await expect(reopened.getByText("Ligação perdida")).toBeVisible();
  await context.setOffline(false);
  await expect(reopened.getByText("Ligação perdida")).toBeHidden();

  await reopened.goto("/");
  await expect(
    reopened.getByRole("button", { name: `Continuar na sala ${code}` }),
  ).toBeVisible();

  await context.close();
});

test("valida convite, sons e revanche com os mesmos jogadores", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Qual é o teu nome?").fill("Ana");
  await page.getByRole("button", { name: "Criar uma sala" }).click();

  await expect(
    page.getByRole("button", { name: "Convidar no WhatsApp" }).first(),
  ).toBeVisible();
  await page.evaluate(() => {
    window.open = ((url?: string | URL) => {
      window.sessionStorage.setItem("test:last-opened-url", String(url));
      return null;
    }) as typeof window.open;
  });
  await page.getByRole("button", { name: "Convidar no WhatsApp" }).first().click();
  const whatsappUrl = await page.evaluate(() =>
    window.sessionStorage.getItem("test:last-opened-url"),
  );
  expect(whatsappUrl).toContain("https://wa.me/?text=");
  expect(decodeURIComponent(whatsappUrl!)).toContain("Vamos jogar STOP online!");

  await expect(
    page.getByRole("button", { name: "Desactivar sons" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Desactivar sons" }).click();
  await expect(page.getByRole("button", { name: "Activar sons" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("stop.ao:sounds"))).toBe(
    "off",
  );
  await page.getByRole("button", { name: "Activar sons" }).click();

  await page.getByRole("button", { name: "Preparar primeira rodada" }).click();
  await page.getByRole("button", { name: /^A/ }).click();

  const answerInputs = page.getByPlaceholder("A...");
  await expect(answerInputs).toHaveCount(5);
  const answers = ["Ana", "Angola", "Arroz", "Actor", "Antílope"];
  for (const [index, answer] of answers.entries()) {
    await answerInputs.nth(index).fill(answer);
  }
  await page.getByRole("button", { name: "Gritar STOP" }).click();
  await expect(page.getByText("+100 pontos")).toBeVisible();

  await page.getByRole("button", { name: "Ver classificação final" }).click();
  await expect(page.getByRole("button", { name: "Iniciar revanche" })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar revanche" }).click();

  await expect(page.getByText("Ana (tu)", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preparar primeira rodada" }),
  ).toBeVisible();
});

test("mantém acções e controlos flutuantes separados em ecrãs compactos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 584, height: 500 });
  await page.goto("/");
  await page.getByLabel("Qual é o teu nome?").fill("Lia");
  await page.getByRole("button", { name: "Criar uma sala" }).click();

  const sound = await page
    .getByRole("button", { name: "Desactivar sons" })
    .boundingBox();
  const language = await page.getByLabel("Idioma").boundingBox();

  expect(sound).not.toBeNull();
  expect(language).not.toBeNull();
  expect(sound!.y + sound!.height).toBeLessThan(language!.y);

  await page.goto("/");
  const createRoom = await page
    .getByRole("button", { name: "Criar uma sala" })
    .boundingBox();
  const resumeRoom = await page
    .getByRole("button", { name: /Continuar na sala/ })
    .boundingBox();

  expect(createRoom).not.toBeNull();
  expect(resumeRoom).not.toBeNull();
  expect(resumeRoom!.y).toBeGreaterThan(createRoom!.y + createRoom!.height + 8);
});

test("expõe PWA instalável e regista o service worker", async ({
  page,
  request,
}) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  const manifest = (await manifestResponse.json()) as {
    name: string;
    short_name: string;
    display: string;
    icons: Array<{ src: string; sizes: string; purpose: string }>;
  };

  expect(manifestResponse.ok()).toBe(true);
  expect(manifest).toMatchObject({
    name: "stop.ao - Jogo Stop Online",
    short_name: "stop.ao",
    display: "standalone",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );

  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.ok()).toBe(true);
  expect(workerResponse.headers()["cache-control"]).toContain("no-cache");
  expect(workerResponse.headers()["service-worker-allowed"]).toBe("/");

  await page.goto("/");
  const workerUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });
  expect(workerUrl).toContain("/sw.js");

  await page.evaluate(() => {
    const installEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(installEvent, {
      prompt: {
        value: async () => {
          window.sessionStorage.setItem("test:pwa-prompted", "1");
        },
      },
      userChoice: {
        value: Promise.resolve({ outcome: "accepted", platform: "web" }),
      },
    });
    window.dispatchEvent(installEvent);
  });

  await page.getByRole("button", { name: "Instalar", exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("test:pwa-prompted"))).toBe(
    "1",
  );

  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.context().setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Pensa rápido/ })).toBeVisible();
  await page.context().setOffline(false);
});

test("expõe o código de verificação do Google AdSense", async ({ request }) => {
  const response = await request.get("/");
  const html = await response.text();

  expect(response.ok()).toBe(true);
  expect(html).toContain(
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9068523374327625",
  );
  expect(html).toContain('crossorigin="anonymous"');
});

test("publica a autorização do Google AdSense em ads.txt", async ({
  request,
}) => {
  const response = await request.get("/ads.txt");

  expect(response.ok()).toBe(true);
  await expect(response.text()).resolves.toContain(
    "google.com, pub-9068523374327625, DIRECT, f08c47fec0942fa0",
  );
});

test("publica a política de privacidade e consentimento nos três idiomas", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacidade e consentimento" }).click();

  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(
    page.getByRole("heading", {
      name: "Joga tranquilo. Os teus dados ficam claros.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Google AdSense")).toBeVisible();

  await page.getByLabel("Idioma").selectOption("en");
  await expect(
    page.getByRole("heading", {
      name: "Play with peace of mind. Your data stays clear.",
    }),
  ).toBeVisible();

  await page.getByLabel("Language").selectOption("fr");
  await expect(
    page.getByRole("heading", {
      name: "Joue sereinement. Tes données restent claires.",
    }),
  ).toBeVisible();
});
