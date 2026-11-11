import type { Metadata } from "next";
import { fetchShopItems } from "@/lib/deadlock";
import ItemsCatalog from "./ItemsCatalog";

export const instant = false;
export const metadata: Metadata = {
  title: "LockPro • Itens de Deadlock",
  description: "Catálogo dos itens da loja de Deadlock, carregado da Deadlock API.",
};

export default async function ItemsPage() {
  const [items] = await Promise.all([
    fetchShopItems(),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Deadlock <span className="text-amber-500">Itens</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium tracking-wide mt-2">
          Todos os itens da loja por categoria e tier, carregados da Deadlock API, uma API comunitária não oficial.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-rose-400">
          Não foi possível carregar os itens agora. Tente novamente em alguns minutos.
        </p>
      ) : (
        <ItemsCatalog items={items} />
      )}
    </div>
  );
}