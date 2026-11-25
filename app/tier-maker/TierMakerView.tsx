import TierMakerClient from "./TierMakerClient";
import { loadMakerData } from "./loadMakerData";

export default async function TierMakerView() {
  const { makerHeroes, metaTiers } = await loadMakerData();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-6">
      <TierMakerClient heroes={makerHeroes} metaTiers={metaTiers} />
    </div>
  );
}