import { afterEach } from "vitest";
import { clearTestQueryClients } from "./query-client";

afterEach(() => {
  clearTestQueryClients();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
