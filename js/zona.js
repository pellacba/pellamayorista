(function () {
  const ZONA_KEY = "pellaclick_zona";
  const SUPABASE_URL = "https://xwuprneexjwzjttujbiu.supabase.co";
  const SUPABASE_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXBybmVleGp3emp0dHVqYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA4OTksImV4cCI6MjA3NDc0Njg5OX0.sVQrMzIObXgHvlVhWD3C2SD3Z0_tiG9Kc48PrTIEovs";

  window.Zona = {
    get() {
      return localStorage.getItem(ZONA_KEY);
    },
    set(zona) {
      localStorage.setItem(ZONA_KEY, zona);
    },
    clear() {
      localStorage.removeItem(ZONA_KEY);
    },
    getLabel() {
      const z = this.get();
      if (z === "sf") return "San Francisco";
      if (z === "rio3") return "Río Tercero";
      return "";
    },
    getStockTable() {
      return this.get() === "sf" ? "Stocks_Sf" : "Stocks_Rio3";
    },
    async fetchStockSet() {
      const table = this.getStockTable();
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?select=art_id&stock=gt.0`,
          {
            headers: {
              apikey: SUPABASE_ANON,
              Authorization: `Bearer ${SUPABASE_ANON}`,
            },
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Stock fetch failed: " + res.status);
        const data = await res.json();
        const set = new Set(data.map((r) => String(r.art_id)));
        return set;
      } catch (e) {
        console.error("[Zona] No se pudo cargar el stock:", e);
        return null; // null = mostrar todos (graceful fallback)
      }
    },
  };
})();
