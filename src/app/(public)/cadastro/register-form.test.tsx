import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { createQueryClient } from "@/lib/query-client";
import { registerAccount } from "@/services/auth";
import CadastroPage from "@/app/(public)/cadastro/page";

const routerPushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock("@/services/auth", () => ({
  registerAccount: vi.fn(),
}));

const successResponse = {
  user: {
    id: "user-id",
    name: "Ana Silva",
    email: "ana@example.com",
    avatar_url: null,
    is_active: true,
    created_at: "2026-07-13T09:00:00Z",
  },
  organization: {
    id: "org-id",
    name: "Acme Suporte",
    slug: "acme-suporte",
    created_at: "2026-07-13T09:00:00Z",
  },
  membership: {
    id: "membership-id",
    role: "ADMIN",
    is_active: true,
    created_at: "2026-07-13T09:00:00Z",
  },
} as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

function renderCadastro() {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <CadastroPage />
    </QueryClientProvider>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "Ana Silva" },
  });
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "ana@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Nome da organizacao"), {
    target: { value: "Acme Suporte" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: "Senha123" },
  });
  fireEvent.change(screen.getByLabelText("Confirmacao de senha"), {
    target: { value: "Senha123" },
  });
}

async function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("CadastroPage", () => {
  beforeEach(() => {
    vi.mocked(registerAccount).mockReset();
    routerPushMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("renders the register form", () => {
    renderCadastro();

    expect(
      screen.getByRole("heading", { level: 1, name: "Crie sua conta" }),
    ).toBeDefined();
    expect(screen.getByLabelText("Nome")).toBeDefined();
    expect(screen.getByLabelText("E-mail")).toBeDefined();
    expect(screen.getByLabelText("Nome da organizacao")).toBeDefined();
    expect(screen.getByLabelText("Senha")).toBeDefined();
    expect(screen.getByLabelText("Confirmacao de senha")).toBeDefined();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeDefined();
  });

  it("validates required fields and focuses the first invalid field", async () => {
    renderCadastro();

    await submitForm();

    expect(await screen.findAllByText("Campo obrigatorio.")).toHaveLength(5);
    expect(document.activeElement).toBe(screen.getByLabelText("Nome"));
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("validates invalid email", async () => {
    renderCadastro();

    fillValidForm();
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "email-invalido" },
    });
    await submitForm();

    expect(await screen.findByText("Informe um e-mail valido.")).toBeDefined();
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("validates invalid password", async () => {
    renderCadastro();

    fillValidForm();
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senhafraca" },
    });
    fireEvent.change(screen.getByLabelText("Confirmacao de senha"), {
      target: { value: "senhafraca" },
    });
    await submitForm();

    expect(
      await screen.findByText(
        "A senha deve ter entre 8 e 128 caracteres e conter letras e numeros.",
      ),
    ).toBeDefined();
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("validates mismatched password confirmation", async () => {
    renderCadastro();

    fillValidForm();
    fireEvent.change(screen.getByLabelText("Confirmacao de senha"), {
      target: { value: "Senha124" },
    });
    await submitForm();

    expect(
      await screen.findByText("As senhas informadas nao coincidem."),
    ).toBeDefined();
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("registers successfully and redirects to login", async () => {
    vi.mocked(registerAccount).mockResolvedValueOnce(successResponse);
    renderCadastro();

    fillValidForm();
    await submitForm();

    expect(
      await screen.findByText(
        "Cadastro criado para ana@example.com. Redirecionando para o login.",
      ),
    ).toBeDefined();

    await waitFor(
      () => {
        expect(routerPushMock).toHaveBeenCalledWith(
          "/login?email=ana%40example.com",
        );
      },
      { timeout: 1500 },
    );
  });

  it("handles duplicate email", async () => {
    vi.mocked(registerAccount).mockRejectedValueOnce(
      new ApiError({
        status: 409,
        code: "email_already_registered",
        message: "E-mail ja cadastrado.",
      }),
    );
    renderCadastro();

    fillValidForm();
    await submitForm();

    expect(
      await screen.findByText(
        "Este e-mail ja esta cadastrado. Entre ou use outro e-mail.",
      ),
    ).toBeDefined();
    expect(await screen.findByText("Este e-mail ja esta cadastrado.")).toBeDefined();
  });

  it("handles validation errors from the API", async () => {
    vi.mocked(registerAccount).mockRejectedValueOnce(
      new ApiError({
        status: 422,
        code: "validation_error",
        message: "Dados de entrada invalidos.",
      }),
    );
    renderCadastro();

    fillValidForm();
    await submitForm();

    expect(
      await screen.findByText("Confira os campos do formulario e tente novamente."),
    ).toBeDefined();
  });

  it("handles unexpected API errors", async () => {
    vi.mocked(registerAccount).mockRejectedValueOnce(
      new ApiError({
        status: 500,
        code: "registration_persistence_error",
        message: "Falha de persistencia durante o cadastro.",
      }),
    );
    renderCadastro();

    fillValidForm();
    await submitForm();

    expect(
      await screen.findByText(
        "Nao foi possivel concluir o cadastro agora. Tente novamente em instantes.",
      ),
    ).toBeDefined();
  });

  it("handles network errors", async () => {
    vi.mocked(registerAccount).mockRejectedValueOnce(new TypeError("Failed fetch"));
    renderCadastro();

    fillValidForm();
    await submitForm();

    expect(
      await screen.findByText(
        "Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.",
      ),
    ).toBeDefined();
  });

  it("disables the button while submitting", async () => {
    const request = deferred<typeof successResponse>();
    vi.mocked(registerAccount).mockReturnValueOnce(request.promise);
    renderCadastro();

    fillValidForm();
    await submitForm();

    const button = await screen.findByRole("button", {
      name: "Criando conta...",
    });
    expect(button).toHaveProperty("disabled", true);

    request.resolve(successResponse);
    await waitFor(() => {
      expect(
        screen.getByText(
          "Cadastro criado para ana@example.com. Redirecionando para o login.",
        ),
      ).toBeDefined();
    });
  });

  it("blocks duplicate submissions while pending", async () => {
    const request = deferred<typeof successResponse>();
    vi.mocked(registerAccount).mockReturnValueOnce(request.promise);
    renderCadastro();

    fillValidForm();
    await submitForm();
    const pendingButton = await screen.findByRole("button", {
      name: "Criando conta...",
    });
    fireEvent.click(pendingButton);

    expect(registerAccount).toHaveBeenCalledTimes(1);

    request.resolve(successResponse);
  });
});
