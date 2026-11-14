import TierMakerClient from "./TierMakerClient";
import { loadMakerData } from "./loadMakerData";

export default async function TierMakerView() {
  const { makerHeroes, metaTiers } = await loadMakerData();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-6">
      <header>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Deadlock <span className="text-amber-500">TierMaker</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium tracking-wide mt-2">
          Personalize nomes, cores e ordens. Publique sua tier list na comunidade ou compartilhe o link.
        </p>
      </header>

      <TierMakerClient heroes={makerHeroes} metaTiers={metaTiers} />
    </div>
  );
}