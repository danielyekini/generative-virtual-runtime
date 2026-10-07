const select = document.querySelector<HTMLSelectElement>("#mode");
if (select) {
  const path = location.pathname.endsWith("/") ? location.pathname : `${location.pathname}/`;
  const current = path === "/" || path.startsWith("/dev/renderer") ? "/dev/renderer/" : path;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
  select.addEventListener("change", () => {
    if (select.value !== current) location.assign(select.value);
  });
}
