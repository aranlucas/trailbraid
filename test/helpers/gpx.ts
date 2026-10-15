import type { GpxDocument, GpxNode } from "@/route";

type GpxFixtureNode = Omit<GpxNode, "getElementsByTagNameNS"> & {
  getElementsByTagNameNS: (namespace: string, name: string) => GpxFixtureNode[];
};

export function gpxNode(
  localName: string,
  attributes: Record<string, string>,
  children: GpxFixtureNode[],
  textContent: string | null = null,
): GpxFixtureNode {
  return {
    localName,
    textContent,
    getAttribute: (name) => attributes[name] ?? null,
    getElementsByTagNameNS: (namespace, name) =>
      children.flatMap((child) => [
        ...(child.localName === name ? [child] : []),
        ...child.getElementsByTagNameNS(namespace, name),
      ]),
  };
}

export function gpxDocument(root: GpxFixtureNode): GpxDocument {
  return {
    documentElement: root,
    querySelector: (selector: string) => root.getElementsByTagNameNS("*", selector)[0] ?? null,
    getElementsByTagNameNS: (namespace: string, name: string) =>
      root.getElementsByTagNameNS(namespace, name),
  };
}
