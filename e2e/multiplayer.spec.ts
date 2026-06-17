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
  await host.getByRole("button", { name: "Foguete" }).click();
  await host.getByRole("button", { name: "Coral" }).click();
  await host.getByRole("button", { name: "Atlântico" }).click();
  await expect(host.locator("html")).toHaveAttribute("data-theme", "atlantic");
  await host.getByRole("button", { name: "Criar uma sala" }).click();
  await expect(host).toHaveURL(/\/sala\/[A-Z0-9]{5}$/);
  const code = host.url().split("/").at(-1)!;

  await guest.goto(`/sala/${code}`);
  await guest.getByLabel("O teu nome").fill("Beto");
  await guest.getByRole("button", { name: "Coroa" }).click();
  await guest.getByRole("button", { name: "Entrar na sala" }).click();
  await expect(guest).toHaveURL(new RegExp(`/sala/${code}$`));
  await expect(host.getByText("Beto", { exact: true })).toBeVisible();
  await expect(host.locator('[data-avatar-id="rocket"]').first()).toBeVisible();
  await expect(host.locator('[data-avatar-id="crown"]').first()).toBeVisible();
  await host
    .getByRole("button", { name: "Diminuir número de rodadas" })
    .click();
  await expect(guest.getByText("Jogadores: 2 · Rodadas: 1")).toBeVisible();
  expect(
    await host.evaluate((roomCode) => {
      const session = JSON.parse(
        localStorage.getItem(`jogastop:player:${roomCode}`) ?? "{}",
      ) as { color?: string };
      return session.color;
    }, code),
  ).toBe("#D96C4D");
  expect(await host.evaluate(() => localStorage.getItem("jogastop:theme"))).toBe(
    "atlantic",
  );

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
  await expect(host.getByText("Fim de jogo", { exact: true })).toBeVisible();
  await expect(guest.getByText("Fim de jogo", { exact: true })).toBeVisible();
  await expect(host.getByText("Beto", { exact: true })).toBeVisible();
  await expect(guest.getByText("Ana", { exact: true })).toBeVisible();

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
  await page.getByRole("button", { name: "Chama" }).click();
  await page.getByRole("button", { name: "Criar uma sala" }).click();
  await expect(page).toHaveURL(/\/sala\/[A-Z0-9]{5}$/);
  const code = page.url().split("/").at(-1)!;

  await expect(page.getByText("Tu decides", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toContain(
    `jogastop:player:${code}`,
  );

  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(`/sala/${code}`);
  await expect(reopened.getByText("Tu decides", { exact: true })).toBeVisible();
  await expect(reopened.locator('[data-avatar-id="flame"]').first()).toBeVisible();
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
  expect(await page.evaluate(() => localStorage.getItem("jogastop:sounds"))).toBe(
    "off",
  );
  await page.getByRole("button", { name: "Activar sons" }).click();

  await page.getByRole("button", { name: "Preparar primeira rodada" }).click();
  await expect(
    page.getByRole("heading", { name: "O comando é teu." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^A/ }).click();

  const answerInputs = page.getByPlaceholder("A...");
  await expect(answerInputs).toHaveCount(5);
  const answers = ["Ana", "Angola", "Arroz", "Actor", "Antílope"];
  for (const [index, answer] of answers.entries()) {
    await answerInputs.nth(index).fill(answer);
  }
  await page.getByRole("button", { name: "Gritar STOP" }).click();
  await expect(page.getByText("Fim de jogo", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar revanche" })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar revanche" }).click();

  await expect(page.getByText("Ana (tu)", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preparar primeira rodada" }),
  ).toBeVisible();
});

test("permite ao anfitrião definir o número de rodadas", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Qual é o teu nome?").fill("Ana");
  await page.getByRole("button", { name: "Criar uma sala" }).click();

  await page
    .getByRole("button", { name: "Aumentar número de rodadas" })
    .click();
  await expect(page.getByText("Definido pelo anfitrião")).toBeVisible();
  await expect(page.getByText("Jogadores: 1 · Rodadas: 2")).toBeVisible();

  await page.getByRole("button", { name: "Preparar primeira rodada" }).click();
  await expect(
    page.getByRole("heading", { name: "O comando é teu." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^A/ }).click();

  const answers = ["Ana", "Angola", "Arroz", "Actor", "Antílope"];
  const answerInputs = page.getByPlaceholder("A...");
  for (const [index, answer] of answers.entries()) {
    await answerInputs.nth(index).fill(answer);
  }
  await page.getByRole("button", { name: "Gritar STOP" }).click();
  await page
    .getByRole("button", { name: "Escolher letra da próxima rodada" })
    .click();

  await expect(page.getByText(/Rodada 2 de 2/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "O comando é teu." }),
  ).toBeVisible();
});

test("permite ao anfitrião criar categorias próprias", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Qual é o teu nome?").fill("Ana");
  await page.getByRole("button", { name: "Criar uma sala" }).click();

  await page.getByLabel("Criar categoria").fill("Marcas");
  await page.getByRole("button", { name: "Adicionar" }).click();

  await expect(page.getByText("Marcas", { exact: true })).toBeVisible();
  await expect(page.getByText("6 seleccionadas")).toBeVisible();

  await page.getByRole("button", { name: "Preparar primeira rodada" }).click();
  await expect(
    page.getByRole("heading", { name: "O comando é teu." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^A/ }).click();

  await expect(page.getByText("Marcas", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("A...")).toHaveCount(6);
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

test("mantém a landing page legível sem cortar conteúdo em ecrãs compactos", async ({
  page,
}) => {
  for (const width of [320, 375, 584]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/");

    const clippedElements = await page.locator("main *").evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          let parent = element.parentElement;
          let insideHorizontalScroller = false;

          while (parent) {
            const overflow = window.getComputedStyle(parent).overflowX;
            if (overflow === "auto" || overflow === "scroll") {
              insideHorizontalScroller = true;
              break;
            }
            parent = parent.parentElement;
          }

          return (
            !insideHorizontalScroller &&
            (rect.left < -1 || rect.right > window.innerWidth + 1)
          );
        })
        .map((element) => ({
          tag: element.tagName,
          text: element.textContent?.trim().slice(0, 50),
        })),
    );

    expect(clippedElements).toEqual([]);
    await expect(page.getByRole("heading", { name: /Pensa rápido/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar uma sala" })).toBeVisible();
  }
});

test("mostra o loading do jogastop enquanto cria a sala", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Qual é o teu nome?").fill("Ana");
  await page.route("**/api/rooms", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });

  await page.getByRole("button", { name: "Criar uma sala" }).click();

  await expect(
    page.getByRole("status", { name: "A criar a tua sala..." }),
  ).toBeVisible();
  await expect(page.locator('[aria-label="jogastop"]').last()).toBeVisible();
  await expect(page).toHaveURL(/\/sala\/[A-Z0-9]+$/);
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
    name: "jogastop - Jogo Stop Online",
    short_name: "jogastop",
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
  await expect(workerResponse.text()).resolves.toContain(
    "cacheFirstNavigation",
  );

  const appResponse = await request.get("/");
  expect(appResponse.headers()["x-jogastop-app"]).toBe("1");

  const instagramLogo = await request.get(
    "/brand/jogastop-logo-instagram.png",
  );
  expect(instagramLogo.ok()).toBe(true);
  expect(instagramLogo.headers()["content-type"]).toContain("image/png");

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
  await expect(page.getByText("Vercel Web Analytics")).toBeVisible();

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
