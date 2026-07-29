export function renderFatalError(container: HTMLElement, message: string): void {
  const heading = document.createElement("h1");
  heading.textContent = "Гру не вдалося запустити";

  const detail = document.createElement("p");
  detail.textContent = message;

  container.classList.add("fatal-error");
  container.setAttribute("role", "alert");
  container.replaceChildren(heading, detail);
}
