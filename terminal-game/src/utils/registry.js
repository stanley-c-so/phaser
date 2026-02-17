import { computeLayout, updateRegistryFromLayout } from "./layout";

export function updateRegistryFromScale(scene) {
  const layoutInfo = computeLayout(scene);
  updateRegistryFromLayout(scene, layoutInfo);
}
