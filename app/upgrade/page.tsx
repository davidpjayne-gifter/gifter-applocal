import { Suspense } from "react";
import UpgradeClient from "./UpgradeClient";

export default function UpgradePage() {
  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <Suspense>
        <UpgradeClient />
      </Suspense>
    </main>
  );
}
