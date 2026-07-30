function currentLang() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lang") || document.cookie.match(/garaly_lang=(\w+)/)?.[1] || "de";
}

function toggleLang() {
  const next = currentLang() === "de" ? "en" : "de";
  document.cookie = `garaly_lang=${next};path=/;max-age=31536000`;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", next);
  window.location.href = url.toString();
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/?lang=" + currentLang();
}
